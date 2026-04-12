"""
Evaluate Arabic OCR model on parquet data.

Default flow:
  1) Load fine-tuned model from ./arabic_trocr_model if it exists.
  2) Fallback to microsoft/trocr-base-printed if no local model exists.
  3) Run recognition on Data arabic test parquet and save CSV results.

Usage examples:
  python "import pandas as pd.py"
  python "import pandas as pd.py" --model-dir arabic_trocr_model --samples 300
"""

from __future__ import annotations

import argparse
import io
from pathlib import Path

import pandas as pd
import torch
from PIL import Image
from transformers import TrOCRProcessor, VisionEncoderDecoderModel


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate Arabic OCR model on parquet data")
    parser.add_argument(
        "--data-file",
        default=r"..\Data arabic\Test-00000-of-00001.parquet",
        help="Path to parquet file with columns: Image, Text",
    )
    parser.add_argument(
        "--model-dir",
        default="arabic_trocr_model",
        help="Fine-tuned model directory (local). If missing, falls back to base model.",
    )
    parser.add_argument(
        "--base-model",
        default="microsoft/trocr-base-printed",
        help="Base model to use when local fine-tuned model is not found",
    )
    parser.add_argument("--samples", type=int, default=200, help="Number of samples to evaluate")
    parser.add_argument("--batch-size", type=int, default=8, help="Batch size for inference")
    parser.add_argument("--max-length", type=int, default=128, help="Max decoded token length")
    parser.add_argument(
        "--output",
        default="recognition_results_arabic.csv",
        help="CSV file where predictions are saved",
    )
    return parser.parse_args()


def safe_preview(text: str, max_chars: int = 60) -> str:
    preview = text[:max_chars]
    return preview.encode("unicode_escape").decode("ascii")


def to_pil(image_obj) -> Image.Image:
    if isinstance(image_obj, Image.Image):
        return image_obj.convert("RGB")
    if isinstance(image_obj, dict) and "bytes" in image_obj:
        return Image.open(io.BytesIO(image_obj["bytes"])).convert("RGB")
    raise ValueError("Unsupported image format in parquet row")


def main() -> None:
    args = parse_args()

    data_file = Path(args.data_file)
    if not data_file.exists():
        raise FileNotFoundError(f"Data file not found: {data_file}")

    model_path = Path(args.model_dir)
    model_source = str(model_path) if model_path.exists() else args.base_model

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading model from: {model_source}")
    print(f"Running on device: {device}")

    processor = TrOCRProcessor.from_pretrained(model_source)
    model = VisionEncoderDecoderModel.from_pretrained(model_source).to(device)
    model.eval()

    print(f"Reading parquet: {data_file}")
    df = pd.read_parquet(data_file)
    if args.samples > 0:
        df = df.head(args.samples)

    if "Image" not in df.columns or "Text" not in df.columns:
        raise ValueError("Parquet must contain columns: Image, Text")

    all_results = []
    total = len(df)
    print(f"Evaluating {total} samples...")

    for start in range(0, total, args.batch_size):
        end = min(start + args.batch_size, total)
        batch = df.iloc[start:end]
        images = [to_pil(img_obj) for img_obj in batch["Image"].tolist()]
        refs = [str(t) for t in batch["Text"].tolist()]

        inputs = processor(images=images, return_tensors="pt").pixel_values.to(device)

        with torch.no_grad():
            generated_ids = model.generate(inputs, max_length=args.max_length)

        preds = processor.batch_decode(generated_ids, skip_special_tokens=True)

        for i, (pred, ref) in enumerate(zip(preds, refs), start=start):
            all_results.append({
                "index": i,
                "prediction": pred,
                "ground_truth": ref,
            })
            print(
                f"[{i}] pred={safe_preview(pred)} | gt={safe_preview(ref)}"
            )

    out_df = pd.DataFrame(all_results)
    out_df.to_csv(args.output, index=False, encoding="utf-8-sig")
    print(f"Saved results to: {args.output}")


if __name__ == "__main__":
    main()