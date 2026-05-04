import express from "express";
import { getDb, ObjectId } from "../../db.js";

const router = express.Router();

const DEFAULT_SETTINGS_LOCATIONS = [
  { name: "Cabinet A - Drawer 1", type: "Cabinet" },
  { name: "Cabinet A - Drawer 2", type: "Cabinet" },
  { name: "Cabinet A - Drawer 3", type: "Cabinet" },
  { name: "Cabinet B - Drawer 1", type: "Cabinet" },
  { name: "Office 1 - Shelf A", type: "Office" },
  { name: "Office 2 - Shelf B", type: "Office" },
  { name: "Storage Room 1", type: "Storage" },
  { name: "Storage Room 2", type: "Storage" },
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

async function seedDefaultLocationsIfEmpty(db) {
  const count = await db.collection("settings_locations").countDocuments();
  if (count > 0) return;

  const now = new Date();
  await db.collection("settings_locations").insertMany(
    DEFAULT_SETTINGS_LOCATIONS.map((item) => ({
      name: item.name,
      type: item.type,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

router.get("/", async (_req, res) => {
  try {
    const db = getDb();
    await seedDefaultLocationsIfEmpty(db);

    const data = await db
      .collection("settings_locations")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return res.json({ success: true, data: data.map(serializeSetting) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch locations";
    return res.status(500).json({ success: false, error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const name = normalizeString(body.name);
    const type = normalizeString(body.type);

    if (!name || !type) {
      return res
        .status(400)
        .json({ success: false, error: "name and type are required" });
    }

    const now = new Date();
    const db = getDb();
    const result = await db.collection("settings_locations").insertOne({
      name,
      type,
      createdAt: now,
      updatedAt: now,
    });

    return res
      .status(201)
      .json({ success: true, data: { id: result.insertedId.toString() } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create location";
    return res.status(500).json({ success: false, error: message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid location id" });
    }

    const updates = { updatedAt: new Date() };
    if (typeof req.body?.name === "string") {
      updates.name = normalizeString(req.body.name);
    }
    if (typeof req.body?.type === "string") {
      updates.type = normalizeString(req.body.type);
    }

    const db = getDb();
    await db
      .collection("settings_locations")
      .updateOne({ _id: new ObjectId(id) }, { $set: updates });

    return res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update location";
    return res.status(500).json({ success: false, error: message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid location id" });
    }

    const db = getDb();
    await db
      .collection("settings_locations")
      .deleteOne({ _id: new ObjectId(id) });

    return res.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete location";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
