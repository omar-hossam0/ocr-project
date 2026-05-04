import express from "express";
import { getDb } from "../../db.js";

const router = express.Router();
const SYSTEM_SETTINGS_DOC_ID = "global";

const DEFAULT_SYSTEM_SETTINGS = {
  fileExpirationDays: 365,
  notifyOnFileExpiration: true,
  notifyOnFileCheckout: true,
  dailySummaryEmail: false,
  maxUploadSizeMb: 50,
};

router.get("/", async (_req, res) => {
  try {
    const db = getDb();
    const doc = await db
      .collection("settings_system")
      .findOne({ _id: SYSTEM_SETTINGS_DOC_ID });

    if (!doc) {
      await db.collection("settings_system").insertOne({
        _id: SYSTEM_SETTINGS_DOC_ID,
        ...DEFAULT_SYSTEM_SETTINGS,
        updatedAt: new Date(),
      });
      return res.json({ success: true, data: DEFAULT_SYSTEM_SETTINGS });
    }

    return res.json({
      success: true,
      data: {
        fileExpirationDays: Number(doc.fileExpirationDays ?? 365),
        notifyOnFileExpiration: Boolean(doc.notifyOnFileExpiration ?? true),
        notifyOnFileCheckout: Boolean(doc.notifyOnFileCheckout ?? true),
        dailySummaryEmail: Boolean(doc.dailySummaryEmail ?? false),
        maxUploadSizeMb: Number(doc.maxUploadSizeMb ?? 50),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch system settings";
    return res.status(500).json({ success: false, error: message });
  }
});

router.patch("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const db = getDb();

    await db.collection("settings_system").updateOne(
      { _id: SYSTEM_SETTINGS_DOC_ID },
      { $set: { ...payload, updatedAt: new Date() } },
      { upsert: true },
    );

    return res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to update system settings";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
