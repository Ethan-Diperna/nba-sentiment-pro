from datasets import load_dataset
from transformers import AutoTokenizer
import os
import json

LABEL_MAP = {0: "negative", 1: "neutral", 2: "positive"}
MODEL_NAME = "distilbert-base-uncased"


def load_tweeteval(max_train=8000, max_val=1000, max_test=1000):
    """Load and tokenize TweetEval sentiment dataset."""
    dataset = load_dataset("tweet_eval", "sentiment")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    def tokenize(batch):
        return tokenizer(
            batch["text"],
            truncation=True,
            padding="max_length",
            max_length=128,
        )

    dataset = dataset.map(tokenize, batched=True)
    dataset = dataset.rename_column("label", "labels")
    dataset.set_format("torch", columns=["input_ids", "attention_mask", "labels"])

    return {
        "train": dataset["train"].select(
            range(min(max_train, len(dataset["train"])))
        ),
        "validation": dataset["validation"].select(
            range(min(max_val, len(dataset["validation"])))
        ),
        "test": dataset["test"].select(
            range(min(max_test, len(dataset["test"])))
        ),
    }


def save_sample_comments(output_path="training/datasets/sample_comments.json"):
    """Save a small labeled sample for manual inspection."""
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
