import os
import csv

from datasets import load_dataset, Dataset
from transformers import AutoTokenizer

LABEL_MAP = {0: "negative", 1: "neutral", 2: "positive"}
LABEL_TO_ID = {"negative": 0, "neutral": 1, "positive": 2}
MODEL_NAME = "distilbert-base-uncased"

NBA_LABELS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "datasets",
    "nba_manual_labels.csv",
)


def _load_nba_csv() -> Dataset:
    texts, labels = [], []
    with open(NBA_LABELS_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            label_id = LABEL_TO_ID.get(row["label"].strip())
            if label_id is not None:
                texts.append(row["text"].strip())
                labels.append(label_id)
    return Dataset.from_dict({"text": texts, "label": labels})


def _tokenize(dataset: Dataset, tokenizer) -> Dataset:
    def tokenize_batch(batch):
        return tokenizer(
            batch["text"],
            truncation=True,
            padding="max_length",
            max_length=128,
        )

    dataset = dataset.map(tokenize_batch, batched=True)
    dataset = dataset.rename_column("label", "labels")
    dataset.set_format("torch", columns=["input_ids", "attention_mask", "labels"])
    return dataset


def load_tweeteval(max_train=8000, max_val=1000, max_test=1000):
    """Load TweetEval + NBA manual labels, tokenize, return train/val/test splits."""
    from datasets import concatenate_datasets

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    tweeteval = load_dataset("tweet_eval", "sentiment")
    nba_dataset = _load_nba_csv()

    # Oversample NBA data 5x so slang has real weight against 8k TweetEval rows
    nba_repeated = concatenate_datasets([nba_dataset] * 5)

    combined_train = concatenate_datasets([
        tweeteval["train"].select(range(min(max_train, len(tweeteval["train"])))),
        nba_repeated,
    ]).shuffle(seed=42)

    train_dataset = _tokenize(combined_train, tokenizer)
    val_dataset = _tokenize(
        tweeteval["validation"].select(range(min(max_val, len(tweeteval["validation"])))),
        tokenizer,
    )
    test_dataset = _tokenize(
        tweeteval["test"].select(range(min(max_test, len(tweeteval["test"])))),
        tokenizer,
    )

    return {
        "train": train_dataset,
        "validation": val_dataset,
        "test": test_dataset,
    }


def save_sample_comments(output_path="training/datasets/sample_comments.json"):
    import json
    dataset = load_dataset("tweet_eval", "sentiment")
    sample = []
    for i in range(min(50, len(dataset["test"]))):
        item = dataset["test"][i]
        sample.append({"text": item["text"], "label": LABEL_MAP[item["label"]]})
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(sample, f, indent=2)
    print(f"Saved {len(sample)} sample comments to {output_path}")


if __name__ == "__main__":
    splits = load_tweeteval()
    for name, split in splits.items():
        print(f"{name}: {len(split)} examples")
    save_sample_comments()
