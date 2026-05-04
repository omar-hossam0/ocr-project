import express from "express";
import { getBucket, ObjectId } from "../db.js";

const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid file id" });
    }

    const bucket = getBucket();
    const _id = new ObjectId(id);
    const files = await bucket.find({ _id }).toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    const file = files[0];
    res.setHeader(
      "Content-Type",
      file.contentType || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file.filename || "download"}"`,
    );

    const downloadStream = bucket.openDownloadStream(_id);
    downloadStream.on("error", () => {
      res.status(500).end();
    });
    downloadStream.pipe(res);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to download file";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
