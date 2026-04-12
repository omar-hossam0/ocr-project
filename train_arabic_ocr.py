"""
Fine-tune TrOCR on Arabic parquet dataset.

Expected parquet schema:
  - Image: dict with keys {'bytes', 'path'} (or PIL image object)
  - Text:  target transcription

Usage example:
  python train_arabic_ocr.py \
    --data-dir "..\\Data arabic" \
    --output-dir "arabic_trocr_model" \
    --epochs 3 \
    --train-samples 40000 \
    --eval-samples 4000
"""

from __future__ import annotations

import argparse
import io
import os
from pathlib import Path
from typing import Dict, List

import pandas as pd
import torch
from PIL import Image
from datasets import Dataset

# Must be set before importing transformers/huggingface_hub.
os.environ.pop("HF_HUB_OFFLINE", None)
os.environ.pop("TRANSFORMERS_OFFLINE", None)

from transformers import (
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    TrOCRProcessor,
    VisionEncoderDecoderModel,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Arabic OCR model using TrOCR")
    parser.add_argument("--data-dir", default=r"..\Data arabic", help="Folder that contains Train/Test parquet files")
    parser.add_argument("--output-dir", default="arabic_trocr_model", help="Directory to save fine-tuned model")
    parser.add_argument("--base-model", default="microsoft/trocr-base-printed", help="Base TrOCR model")
    parser.add_argument("--epochs", type=int, default=3, help="Number of fine-tuning epochs")
    parser.add_argument("--train-batch-size", type=int, default=8, help="Per-device train batch size")
    parser.add_argument("--eval-batch-size", type=int, default=8, help="Per-device eval batch size")
    parser.add_argument("--learning-rate", type=float, default=5e-5, help="Learning rate")
    parser.add_argument("--max-target-length", type=int, default=128, help="Max token length for target text")
    parser.add_argument("--train-samples", type=int, default=0, help="Optional cap on training examples (0 = all)")
    parser.add_argument("--eval-samples", type=int, default=0, help="Optional cap on eval examples (0 = all)")
    parser.add_argument("--num-workers", type=int, default=0, help="Dataloader worker processes")
    return parser.parse_args()


def to_pil(image_obj) -> Image.Image:
    if isinstance(image_obj, Image.Image):
        return image_obj.convert("RGB")
    if isinstance(image_obj, dict) and "bytes" in image_obj:
        return Image.open(io.BytesIO(image_obj["bytes"])).convert("RGB")
    raise ValueError("Unsupported image format in parquet row")


def load_split_df(data_dir: Path, split_prefix: str) -> pd.DataFrame:
    files = sorted(data_dir.glob(f"{split_prefix}-*.parquet"))
    if not files:
        raise FileNotFoundError(f"No {split_prefix}-*.parquet files found in {data_dir}")

    parts = [pd.read_parquet(p) for p in files]
    df = pd.concat(parts, ignore_index=True)

    if "Image" not in df.columns or "Text" not in df.columns:
        raise ValueError("Dataset must contain columns: Image and Text")

    df = df[["Image", "Text"]].dropna()
    df["Text"] = df["Text"].astype(str)
    return df


def build_hf_dataset(df: pd.DataFrame) -> Dataset:
    rows: Dict[str, List] = {
        "image": [to_pil(item) for item in df["Image"].tolist()],
        "text": df["Text"].tolist(),
    }
    return Dataset.from_dict(rows)


def main() -> None:
    args = parse_args()

    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading base model: {args.base_model}")
    try:
        processor = TrOCRProcessor.from_pretrained(args.base_model, local_files_only=False)
        model = VisionEncoderDecoderModel.from_pretrained(args.base_model, local_files_only=False)
    except Exception as e:
        raise RuntimeError(
            "Failed to load base model. If internet is unavailable, download model files first "
            "or pass --base-model to a local model directory."
        ) from e

    # Recommended generation setup for OCR decoding.
    model.config.decoder_start_token_id = processor.tokenizer.bos_token_id
    model.config.pad_token_id = processor.tokenizer.pad_token_id
    model.config.eos_token_id = processor.tokenizer.eos_token_id
    model.config.max_length = args.max_target_length
    model.config.early_stopping = True
    model.config.no_repeat_ngram_size = 0
    model.config.length_penalty = 1.0
    model.config.num_beams = 4

    print("Reading Arabic parquet data...")
    train_df = load_split_df(data_dir, "Train")
    eval_df = load_split_df(data_dir, "Test")

    if args.train_samples > 0:
        train_df = train_df.head(args.train_samples)
    if args.eval_samples > 0:
        eval_df = eval_df.head(args.eval_samples)

    print(f"Train samples: {len(train_df)}")
    print(f"Eval samples : {len(eval_df)}")

    train_ds = build_hf_dataset(train_df)
    eval_ds = build_hf_dataset(eval_df)

    def preprocess_batch(examples):
        pixel_values = processor(images=examples["image"], return_tensors="pt").pixel_values
        labels = processor.tokenizer(
            examples["text"],
            padding="max_length",
            max_length=args.max_target_length,
            truncation=True,
            return_tensors="pt",
        ).input_ids
        labels[labels == processor.tokenizer.pad_token_id] = -100

        return {
            "pixel_values": pixel_values,
            "labels": labels,
        }

    train_ds = train_ds.map(
        preprocess_batch,
        batched=True,
        remove_columns=["image", "text"],
        desc="Tokenizing train split",
    )

    eval_ds = eval_ds.map(
        preprocess_batch,
        batched=True,
        remove_columns=["image", "text"],
        desc="Tokenizing eval split",
    )

    training_args = Seq2SeqTrainingArguments(
        output_dir=str(output_dir),
        predict_with_generate=True,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_strategy="steps",
        logging_steps=100,
        learning_rate=args.learning_rate,
        per_device_train_batch_size=args.train_batch_size,
        per_device_eval_batch_size=args.eval_batch_size,
        num_train_epochs=args.epochs,
        save_total_limit=2,
        fp16=torch.cuda.is_available(),
        dataloader_num_workers=args.num_workers,
        report_to="none",
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        tokenizer=processor.feature_extractor,
    )

    print("Starting fine-tuning...")
    trainer.train()

    print(f"Saving model and processor to: {output_dir}")
    trainer.save_model(str(output_dir))
    processor.save_pretrained(str(output_dir))

    print("Training finished.")


if __name__ == "__main__":
    main()
