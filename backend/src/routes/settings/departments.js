import express from "express";
import { getDb, ObjectId } from "../../db.js";

const router = express.Router();

const DEFAULT_SETTINGS_DEPARTMENTS = [
  "Legal",
  "HR",
  "Finance",
  "Operations",
  "IT",
  "Administration",
];

function normalizeString(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function serializeSetting(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return {
    id: _id.toString(),
    ...rest,
    createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
    updatedAt: rest.updatedAt instanceof Date ? rest.updatedAt.toISOString() : rest.updatedAt,
  };
}

async function seedDefaultDepartmentsIfEmpty(db) {
  const count = await db.collection("settings_departments").countDocuments();
  if (count > 0) return;

  const now = new Date();
  await db.collection("settings_departments").insertMany(
    DEFAULT_SETTINGS_DEPARTMENTS.map((name) => ({
      name,
      filesCount: 0,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

router.get("/", async (_req, res) => {
  try {
    const db = getDb();
    await seedDefaultDepartmentsIfEmpty(db);

    const data = await db
      .collection("settings_departments")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return res.json({ success: true, data: data.map(serializeSetting) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch departments";
    return res.status(500).json({ success: false, error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const name = normalizeString(body.name);
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "name is required" });
    }

    const now = new Date();
    const db = getDb();
    const result = await db.collection("settings_departments").insertOne({
      name,
      filesCount: Number(body.filesCount || 0),
      createdAt: now,
      updatedAt: now,
    });

    return res
      .status(201)
      .json({ success: true, data: { id: result.insertedId.toString() } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create department";
    return res.status(500).json({ success: false, error: message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid department id" });
    }

    const updates = { updatedAt: new Date() };
    if (typeof req.body?.name === "string") {
      updates.name = normalizeString(req.body.name);
    }
    if (typeof req.body?.filesCount === "number") {
      updates.filesCount = req.body.filesCount;
    }

    const db = getDb();
    await db
      .collection("settings_departments")
      .updateOne({ _id: new ObjectId(id) }, { $set: updates });

    return res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update department";
    return res.status(500).json({ success: false, error: message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid department id" });
    }

    const db = getDb();
    await db
      .collection("settings_departments")
      .deleteOne({ _id: new ObjectId(id) });

    return res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete department";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
