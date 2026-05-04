import express from "express";
import { getDb, getBucket, ObjectId } from "../db.js";

const router = express.Router();
const FILES_LIMIT = 500;

function normalizeString(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeDepartmentKey(value) {
  return normalizeString(value).replace(/[.$]/g, "_") || "General";
}

function serializeDates(payload) {
  const result = { ...payload };
  ["uploadedAt", "modifiedAt", "createdAt", "updatedAt"].forEach((key) => {
    if (result[key] instanceof Date) {
      result[key] = result[key].toISOString();
    }
  });
  return result;
}

function serializeFile(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    id: _id.toString(),
    ...serializeDates(rest),
  };
}

function extractStorageId(fileDoc) {
  if (!fileDoc) return null;
  if (fileDoc.storageId) return String(fileDoc.storageId);
  const url = typeof fileDoc.storageUrl === "string" ? fileDoc.storageUrl : "";
  const match = url.match(/\/api\/storage\/([a-f0-9]{24})/i);
  return match ? match[1] : null;
}

async function deleteStorageById(storageId) {
  if (!storageId || !ObjectId.isValid(storageId)) return;
  try {
    const bucket = getBucket();
    await bucket.delete(new ObjectId(storageId));
  } catch {
    // ignore storage delete errors
  }
}

async function updateAllTimeStats(db, department) {
  const deptKey = normalizeDepartmentKey(department);
  await db.collection("statistics").updateOne(
    { _id: "allTime" },
    {
      $inc: {
        totalUploads: 1,
        [`departmentBreakdown.${deptKey}`]: 1,
      },
      $set: { docType: "allTime", lastUpdate: new Date() },
      $setOnInsert: { createdAt: new Date(), departmentBreakdown: {} },
    },
    { upsert: true },
  );
}

async function updateFileStats(db, department) {
  const today = new Date().toISOString().split("T")[0];
  const statsCol = db.collection("statistics");
  const doc = await statsCol.findOne({ _id: "daily" });
  const dates = doc?.dates || {};
  const deptKey = normalizeDepartmentKey(department);

  const todayStats = dates[today] || { uploads: 0, departments: {} };
  todayStats.uploads = Number(todayStats.uploads || 0) + 1;
  todayStats.departments[deptKey] =
    Number(todayStats.departments[deptKey] || 0) + 1;
  dates[today] = todayStats;

  await statsCol.updateOne(
    { _id: "daily" },
    {
      $set: { docType: "daily", dates, lastUpdate: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  await updateAllTimeStats(db, department);
}

router.get("/", async (_req, res) => {
  try {
    const db = getDb();
    const files = await db
      .collection("files")
      .find({})
      .sort({ uploadedAt: -1 })
      .limit(FILES_LIMIT)
      .toArray();

    return res.json({
      success: true,
      data: files.map(serializeFile),
      count: files.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch files";
    return res.status(500).json({ success: false, error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const name = normalizeString(body.name || body.fileName);
    const location = normalizeString(body.physicalLocation || body.location);
    const ocrText = String(body.ocrText || "");

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        error: "'name' (or 'fileName') and 'physicalLocation' are required",
      });
    }

    const now = new Date();
    const filePayload = {
      name,
      originalName: normalizeString(body.originalName || name),
      location,
      physicalLocation: location,
      department: normalizeString(body.department || "General"),
      fileType: normalizeString(body.fileType || "document"),
      documentType: normalizeString(body.documentType || body.fileType || "document"),
      uploadedBy: normalizeString(body.uploadedBy || "system"),
      uploadedAt: now,
      modifiedAt: now,
      modifiedBy: normalizeString(body.modifiedBy || body.uploadedBy || "system"),
      tags: Array.isArray(body.tags) ? body.tags : [],
      notes: String(body.notes || ""),
      ocrText,
      fileSize: Number(body.fileSize || 0),
      status: normalizeString(body.status || "available"),
      storageUrl: typeof body.storageUrl === "string" ? body.storageUrl : undefined,
      storageId: typeof body.storageId === "string" ? body.storageId : undefined,
      views: Number(body.views || 0),
      downloads: Number(body.downloads || 0),
    };

    const db = getDb();
    const result = await db.collection("files").insertOne(filePayload);

    updateFileStats(db, filePayload.department).catch(() => {
      // stats update is best-effort
    });

    return res.status(201).json({
      success: true,
      message: "File metadata saved successfully",
      data: {
        id: result.insertedId.toString(),
        fileName: filePayload.name,
        documentType: filePayload.documentType,
        physicalLocation: filePayload.physicalLocation,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save file";
    return res.status(500).json({ success: false, error: message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "File id is required" });
    }

    const db = getDb();
    const file = await db
      .collection("files")
      .findOne({ _id: new ObjectId(id) });

    if (!file) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    return res.json({ success: true, data: serializeFile(file) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch file";
    return res.status(500).json({ success: false, error: message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "File id is required" });
    }

    const updates = { ...(req.body || {}) };
    delete updates.id;
    delete updates._id;
    updates.modifiedAt = new Date();

    if (typeof updates.name === "string") {
      updates.name = normalizeString(updates.name);
    }
    if (typeof updates.physicalLocation === "string") {
      updates.physicalLocation = normalizeString(updates.physicalLocation);
    }
    if (typeof updates.location === "string") {
      updates.location = normalizeString(updates.location);
    }

    const db = getDb();
    await db
      .collection("files")
      .updateOne({ _id: new ObjectId(id) }, { $set: updates });

    const updated = await db
      .collection("files")
      .findOne({ _id: new ObjectId(id) });

    return res.json({ success: true, data: serializeFile(updated) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update file";
    return res.status(500).json({ success: false, error: message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "File id is required" });
    }

    const db = getDb();
    const existing = await db
      .collection("files")
      .findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    const storageId = extractStorageId(existing);
    if (storageId) {
      await deleteStorageById(storageId);
    }

    await db.collection("files").deleteOne({ _id: new ObjectId(id) });

    return res.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete file";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
