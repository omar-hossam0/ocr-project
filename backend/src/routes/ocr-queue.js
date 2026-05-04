import express from "express";
import { getDb, ObjectId } from "../db.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.fileId || !body.storageUrl) {
      return res.status(400).json({
        success: false,
        error: "fileId and storageUrl are required",
      });
    }

    if (!ObjectId.isValid(body.fileId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid fileId" });
    }

    const db = getDb();
    await db.collection("files").updateOne(
      { _id: new ObjectId(body.fileId) },
      {
        $set: {
          status: "processing",
          notes: "OCR processing in background",
          modifiedAt: new Date(),
        },
      },
    );

    return res.status(202).json({
      success: true,
      message: "OCR started in background",
      fileId: body.fileId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to queue OCR";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
