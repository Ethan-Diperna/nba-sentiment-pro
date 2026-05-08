import os
import sys
import json

# Add project root to path so local imports resolve
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from transformers import pipeline, AutoTokenizer, DistilBertForSequenceClassification
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datasets import load_dataset

from training.scripts.dataset_loader import load_tweeteval

CHECKPOINT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "checkpoints",
    "distilbert-nba-sentiment",
)
EVAL_DIR = os.path.dirname(os.path.abspath(__file__))
LABEL_NAMES = ["negative", "neutral", "positive"]


# ---------------------------------------------------------------------------
# VADER helpers
# ---------------------------------------------------------------------------

def vader_predict(texts):
    """Map VADER compound score to 3-class label index.

    compound >= 0.05  → positive (2)
    compound <= -0.05 → negative (0)
    else              → neutral  (1)
    """
    analyzer = SentimentIntensityAnalyzer()
    predictions = []
    for text in texts:
        score = analyzer.polarity_scores(text)["compound"]
        if score >= 0.05:
            predictions.append(2)
        elif score <= -0.05:
            predictions.append(0)
        else:
            predictions.append(1)
    return predictions


# ---------------------------------------------------------------------------
# DistilBERT helpers
# ---------------------------------------------------------------------------

def distilbert_predict(texts, checkpoint_dir):
    """Load the fine-tuned 3-class model and return label indices.

    Falls back to SST-2 pretrained model with score thresholding when no
    fine-tuned checkpoint is present.
    """
    if os.path.isdir(checkpoint_dir) and os.path.exists(
        os.path.join(checkpoint_dir, "config.json")
    ):
        print(f"Loading fine-tuned model from {checkpoint_dir}")
        tokenizer = AutoTokenizer.from_pretrained(checkpoint_dir)
        model = DistilBertForSequenceClassification.from_pretrained(checkpoint_dir)
        clf = pipeline(
            "text-classification",
            model=model,
            tokenizer=tokenizer,
            truncation=True,
            max_length=128,
        )
        results = clf(texts, batch_size=32)
        label2idx = {"negative": 0, "neutral": 1, "positive": 2}
        return [label2idx.get(r["label"].lower(), 1) for r in results]

    print("Fine-tuned checkpoint not found — falling back to SST-2 pretrained model.")
    clf = pipeline(
        "text-classification",
        model="distilbert-base-uncased-finetuned-sst-2-english",
        truncation=True,
        max_length=128,
    )
    results = clf(texts, batch_size=32)
    predictions = []
    for r in results:
        label = r["label"].upper()
        score = r["score"]
        if label == "POSITIVE":
            predictions.append(2 if score >= 0.75 else 1)
        else:
            predictions.append(0 if score >= 0.75 else 1)
    return predictions


# ---------------------------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------------------------

def evaluate():
    print("Loading TweetEval test split...")
    raw_dataset = load_dataset("tweet_eval", "sentiment")
    test_raw = raw_dataset["test"]

    splits = load_tweeteval(max_test=1000)
    test_size = len(splits["test"])

    texts = [test_raw[i]["text"] for i in range(test_size)]
    true_labels = [test_raw[i]["label"] for i in range(test_size)]

    # --- DistilBERT ---
    print("\nRunning DistilBERT predictions...")
    db_preds = distilbert_predict(texts, CHECKPOINT_DIR)

    db_acc = accuracy_score(true_labels, db_preds)
    db_report_dict = classification_report(
        true_labels, db_preds, target_names=LABEL_NAMES, output_dict=True
    )
    db_report_str = classification_report(
        true_labels, db_preds, target_names=LABEL_NAMES
    )
    db_cm = confusion_matrix(true_labels, db_preds)

    print(f"\nDistilBERT accuracy: {db_acc:.4f}")
    print("\nDistilBERT classification report:")
    print(db_report_str)

    # --- VADER ---
    print("Running VADER predictions...")
    vader_preds = vader_predict(texts)

    vader_acc = accuracy_score(true_labels, vader_preds)
    vader_report_dict = classification_report(
        true_labels, vader_preds, target_names=LABEL_NAMES, output_dict=True
    )
    vader_report_str = classification_report(
        true_labels, vader_preds, target_names=LABEL_NAMES
    )
    vader_cm = confusion_matrix(true_labels, vader_preds)

    print(f"\nVADER accuracy: {vader_acc:.4f}")
    print("\nVADER classification report:")
    print(vader_report_str)

    # --- Accuracy comparison ---
    delta = db_acc - vader_acc
    direction = "better" if delta >= 0 else "worse"
    print("\n--- Accuracy Comparison ---")
    print(f"  DistilBERT (fine-tuned): {db_acc:.4f}")
    print(f"  VADER baseline:          {vader_acc:.4f}")
    print(f"  DistilBERT is {abs(delta):.4f} {direction} than VADER")

    # --- Side-by-side confusion matrix PNG ---
    os.makedirs(EVAL_DIR, exist_ok=True)

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    sns.heatmap(
        db_cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=LABEL_NAMES,
        yticklabels=LABEL_NAMES,
        ax=axes[0],
    )
    axes[0].set_title(f"DistilBERT  (acc={db_acc:.3f})", fontsize=13)
    axes[0].set_xlabel("Predicted")
    axes[0].set_ylabel("True")

    sns.heatmap(
        vader_cm,
        annot=True,
        fmt="d",
        cmap="Oranges",
        xticklabels=LABEL_NAMES,
        yticklabels=LABEL_NAMES,
        ax=axes[1],
    )
    axes[1].set_title(f"VADER Baseline  (acc={vader_acc:.3f})", fontsize=13)
    axes[1].set_xlabel("Predicted")
    axes[1].set_ylabel("True")

    plt.suptitle("Confusion Matrices: DistilBERT vs VADER", fontsize=15, y=1.02)
    plt.tight_layout()

    cm_path = os.path.join(EVAL_DIR, "confusion_matrix.png")
    plt.savefig(cm_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"\nConfusion matrix saved to {cm_path}")

    # --- JSON report ---
    report = {
        "distilbert": {
            "accuracy": db_acc,
            "report": db_report_dict,
            "confusion_matrix": db_cm.tolist(),
        },
        "vader": {
            "accuracy": vader_acc,
            "report": vader_report_dict,
            "confusion_matrix": vader_cm.tolist(),
        },
        "comparison": {
            "distilbert_accuracy": db_acc,
            "vader_accuracy": vader_acc,
            "delta": delta,
        },
    }

    report_path = os.path.join(EVAL_DIR, "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Evaluation report saved to {report_path}")

    return report


if __name__ == "__main__":
    evaluate()
