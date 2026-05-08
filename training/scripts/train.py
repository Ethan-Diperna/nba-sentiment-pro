import os
import sys
import json

# Add project root to path so local imports resolve
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import numpy as np
from sklearn.metrics import accuracy_score, f1_score
from transformers import (
    AutoTokenizer,
    DistilBertForSequenceClassification,
    TrainingArguments,
    Trainer,
)

from training.scripts.dataset_loader import load_tweeteval, MODEL_NAME

CHECKPOINT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "checkpoints",
    "distilbert-nba-sentiment",
)
LABEL_NAMES = ["negative", "neutral", "positive"]
NUM_LABELS = 3


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    acc = accuracy_score(labels, predictions)
    f1 = f1_score(labels, predictions, average="macro")
    return {"accuracy": acc, "f1": f1}


def train():
    print("Loading dataset...")
    splits = load_tweeteval(max_train=8000, max_val=1000, max_test=1000)
    train_dataset = splits["train"]
    val_dataset = splits["validation"]

    print(f"Train size: {len(train_dataset)}, Val size: {len(val_dataset)}")

    print(f"Loading model: {MODEL_NAME}")
    model = DistilBertForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=NUM_LABELS,
        id2label={i: label for i, label in enumerate(LABEL_NAMES)},
        label2id={label: i for i, label in enumerate(LABEL_NAMES)},
    )

    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=CHECKPOINT_DIR,
        num_train_epochs=3,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=16,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        logging_dir=os.path.join(CHECKPOINT_DIR, "logs"),
        logging_steps=50,
        report_to="none",
        save_total_limit=2,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        compute_metrics=compute_metrics,
    )

    print("Starting training...")
    trainer.train()

    print("Evaluating best model on validation set...")
    eval_results = trainer.evaluate()
    print("Eval results:", eval_results)

    print(f"Saving model and tokenizer to {CHECKPOINT_DIR}")
    trainer.save_model(CHECKPOINT_DIR)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    tokenizer.save_pretrained(CHECKPOINT_DIR)

    results_path = os.path.join(CHECKPOINT_DIR, "training_results.json")
    with open(results_path, "w") as f:
        json.dump(eval_results, f, indent=2)
    print(f"Training results saved to {results_path}")

    return eval_results


if __name__ == "__main__":
    results = train()
    print("\nFinal evaluation results:")
    for key, value in results.items():
        if isinstance(value, float):
            print(f"  {key}: {value:.4f}")
        else:
            print(f"  {key}: {value}")
