import express from "express";
import multer from "multer";
import { getBucket } from "../db.js";

const router = express.Router();

const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 50);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadMb * 1024 * 1024 },
});

function sanitizeFilename(name) {
  return String(name || "upload")
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "File is required" });
    }

    const bucket = getBucket();
    const safeName = sanitizeFilename(file.originalname);
    const uploadStream = bucket.openUploadStream(safeName, {
      contentType: file.mimetype || "application/octet-stream",
      metadata: {
        originalName: file.originalname,
        size: file.size,
      },
    });

    await new Promise((resolve, reject) => {
      uploadStream.on("error", reject);
      uploadStream.on("finish", resolve);
      uploadStream.end(file.buffer);
    });

    const storageId = uploadStream.id?.toString();
    const storageUrl = storageId ? `/api/storage/${storageId}` : undefined;

    return res.json({ storageUrl, storageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return res.status(500).json({ error: message });
  }
});

export default router;
