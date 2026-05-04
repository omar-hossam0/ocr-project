import express from "express";
import { getDb, ObjectId } from "../db.js";

const router = express.Router();
const ALLOWED_ACTIONS = ["taken", "returned", "moved"];

function serializeTransaction(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    id: _id.toString(),
    ...rest,
    dateTime: rest.dateTime instanceof Date ? rest.dateTime.toISOString() : rest.dateTime,
    createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const fileId = req.query.fileId ? String(req.query.fileId) : undefined;
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const action = req.query.action ? String(req.query.action) : undefined;
    const limitRows = Number(req.query.limit || 100);

    if (action && !ALLOWED_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Allowed actions: taken, returned, moved",
      });
    }

    const query = {};
    if (fileId) query.fileId = fileId;
    if (userId) query.userId = userId;
    if (action) query.action = action;

    const db = getDb();
    const transactions = await db
      .collection("fileTransactions")
      .find(query)
      .sort({ dateTime: -1 })
      .limit(limitRows)
      .toArray();

    return res.json({
      success: true,
      count: transactions.length,
      data: transactions.map(serializeTransaction),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch tracking records";
    return res.status(500).json({ success: false, error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.fileId || !body.userId || !body.action) {
      return res.status(400).json({
        success: false,
        error: "fileId, userId, and action are required",
      });
    }

    if (!ObjectId.isValid(body.fileId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid fileId" });
    }

    if (!ALLOWED_ACTIONS.includes(body.action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Allowed actions: taken, returned, moved",
      });
    }

    if (
      (body.action === "moved" || body.action === "returned") &&
      !body.toLocation
    ) {
      return res.status(400).json({
        success: false,
        error: "toLocation is required for moved and returned actions",
      });
    }

    const db = getDb();
    const file = await db
      .collection("files")
      .findOne({ _id: new ObjectId(body.fileId) });

    if (!file) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    const now = new Date();
    const currentLocation =
      file.physicalLocation || file.location || "Unknown";
    const fromLocation = body.fromLocation || currentLocation;
    const toLocation = body.toLocation || currentLocation;

    const transaction = {
      fileId: body.fileId,
      userId: body.userId,
      userName: body.userName || "",
      action: body.action,
      fromLocation,
      toLocation,
      note: body.note || "",
      dateTime: now,
      createdAt: now,
    };

    const result = await db
      .collection("fileTransactions")
      .insertOne(transaction);

    const updates = {
      modifiedAt: now,
      modifiedBy: body.userName || body.userId,
    };

    if (body.action === "taken") {
      updates.status = "checked_out";
    }

    if (body.action === "returned" || body.action === "moved") {
      updates.status = "available";
      updates.location = toLocation;
      updates.physicalLocation = toLocation;
    }

    await db
      .collection("files")
      .updateOne({ _id: new ObjectId(body.fileId) }, { $set: updates });

    await db.collection("tracking").insertOne({
      fileId: body.fileId,
      fileName: file.name || "Unknown",
      action: body.action === "taken" ? "checked_out" : body.action,
      user: body.userName || body.userId,
      userDepartment: file.department || "Unknown",
      timestamp: now,
    });

    return res.status(201).json({
      success: true,
      message: "Tracking transaction recorded successfully",
      data: { transactionId: result.insertedId.toString() },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create tracking record";
    return res.status(500).json({ success: false, error: message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Tracking record id is required" });
    }

    const db = getDb();
    await db
      .collection("fileTransactions")
      .deleteOne({ _id: new ObjectId(id) });

    return res.json({
      success: true,
      message: "Tracking record deleted successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete tracking record";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
