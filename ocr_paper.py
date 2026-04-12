"""
Full-document OCR on a single image (e.g. a photo of a paper).
Pipeline:
  1. Page orientation  → detect if the whole page is rotated (0/90/180/270°)
  2. Crop orientation  → detect rotation of each detected word crop
  3. OCR               → db_resnet50 detection + crnn_vgg16_bn recognition

Usage:
    python ocr_paper.py                   # reads 'paper.jpg' by default
    python ocr_paper.py my_photo.jpg      # or pass any image path as argument
"""

import sys
import os
import numpy as np
from PIL import Image
from doctr.io import DocumentFile
from doctr.models import ocr_predictor
from doctr.models.classification import (
    crop_orientation_predictor,
    page_orientation_predictor,
)

ORIENTATION_LABELS = {0: "0°", 1: "90°", 2: "180°", 3: "270°"}

# ── Input image ───────────────────────────────────────────────
image_path = sys.argv[1] if len(sys.argv) > 1 else "paper.jpg"

if not os.path.exists(image_path):
    print(f"[ERROR] Image not found: {image_path}")
    print("  Put your paper photo in this folder and name it 'paper.jpg',")
    print("  or run:  python ocr_paper.py <your_image.jpg>")
    sys.exit(1)

# ── Load image as numpy array (H, W, 3) uint8 ────────────────
page_np = np.array(Image.open(image_path).convert("RGB"))

# ══════════════════════════════════════════════════════════════
# STEP 1 — Page orientation predictor
# ══════════════════════════════════════════════════════════════
print("Loading page orientation model ...")
page_ori_model = page_orientation_predictor(
    arch="mobilenet_v3_small_page_orientation",
    pretrained=True,
    batch_size=4,
)

# Input: list of full-page numpy arrays (H, W, 3)
page_preds = page_ori_model([page_np])
# Returns list of (class_index, confidence) per page
page_class, page_conf = page_preds[0]
page_angle = ORIENTATION_LABELS.get(page_class, f"class {page_class}")
print(f"  → Page orientation: {page_angle}  (confidence: {page_conf:.4f})\n")

# ══════════════════════════════════════════════════════════════
# STEP 2 — Crop orientation predictor (on synthetic crops here;
#           in a real pipeline this runs on detected word boxes)
# ══════════════════════════════════════════════════════════════
print("Loading crop orientation model ...")
crop_ori_model = crop_orientation_predictor(
    arch="mobilenet_v3_small_crop_orientation",
    pretrained=True,
    batch_size=128,
)

# Simulate word crops: split the page into a rough 4×4 grid of patches
h, w = page_np.shape[:2]
cell_h, cell_w = h // 4, w // 4
crops = [
    page_np[r * cell_h:(r + 1) * cell_h, c * cell_w:(c + 1) * cell_w]
    for r in range(4) for c in range(4)
]

crop_preds = crop_ori_model(crops)   # list of (class_index, confidence)
print("  Crop orientations (16 grid patches):")
for idx, (cls, conf) in enumerate(crop_preds):
    angle = ORIENTATION_LABELS.get(cls, f"class {cls}")
    print(f"    patch {idx:02d}: {angle}  (conf: {conf:.4f})")
print()

# ══════════════════════════════════════════════════════════════
# STEP 3 — Full OCR  (detection + crnn_vgg16_bn recognition)
# ══════════════════════════════════════════════════════════════
print("Loading OCR model (first run downloads weights ~150 MB) ...")
ocr_model = ocr_predictor(
    det_arch="db_resnet50",
    reco_arch="crnn_vgg16_bn",
    pretrained=True,
    assume_straight_pages=(page_class == 0),   # skip deskew if page is upright
)
print("Model ready.\n")

doc = DocumentFile.from_images(image_path)
result = ocr_model(doc)

# ── Print recognised text ─────────────────────────────────────
print("=" * 60)
print("RECOGNISED TEXT")
print("=" * 60)
text = result.render()
print(text)

# ── Save to file ──────────────────────────────────────────────
out_path = os.path.splitext(image_path)[0] + "_ocr_result.txt"
with open(out_path, "w", encoding="utf-8") as f:
    f.write(text)

print(f"\nSaved → {out_path}")
