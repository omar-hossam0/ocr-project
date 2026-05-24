import express from "express";
import { getDb, ObjectId } from "../../db.js";

const router = express.Router();

const DEFAULT_SETTINGS_LOCATIONS = [
  { name: "Main Campus - Coastal Road (Gamasa)", nameAr: "الحرم الرئيسي - الطريق الساحلي (جمصة)", type: "Campus", typeAr: "حرم جامعي" },
  { name: "University Administration Building", nameAr: "مبنى إدارة الجامعة", type: "Administrative", typeAr: "إداري" },
  { name: "Faculty of Medicine Building", nameAr: "مبنى كلية الطب البشري", type: "Academic", typeAr: "أكاديمي" },
  { name: "Faculty of Dentistry Building", nameAr: "مبنى كلية طب الفم والأسنان", type: "Academic", typeAr: "أكاديمي" },
  { name: "Faculty of Engineering Building", nameAr: "مبنى كلية الهندسة", type: "Academic", typeAr: "أكاديمي" },
  { name: "Central Library", nameAr: "المكتبة المركزية", type: "Academic Support", typeAr: "دعم أكاديمي" },
  { name: "Student Services Center", nameAr: "مركز خدمات الطلاب", type: "Student Services", typeAr: "خدمات طلابية" },
  { name: "University Housing - Block A", nameAr: "المدينة الجامعية - بلوك أ", type: "Student Housing", typeAr: "إسكان طلابي" },
  { name: "University Housing - Block B", nameAr: "المدينة الجامعية - بلوك ب", type: "Student Housing", typeAr: "إسكان طلابي" },
  { name: "Sports Excellence Center", nameAr: "مركز التميز الرياضي", type: "Sports Facility", typeAr: "مرفق رياضي" },
  { name: "University Mosque", nameAr: "مسجد الجامعة", type: "Religious Facility", typeAr: "مرفق ديني" },
  { name: "Teaching Hospital", nameAr: "المستشفى الجامعي التعليمي", type: "Medical Facility", typeAr: "مرفق طبي" },
  { name: "Conference & Events Hall", nameAr: "قاعة المؤتمرات والاحتفالات", type: "Events", typeAr: "فعاليات" },
  { name: "Medical Clinics", nameAr: "العيادات الطبية الخارجية", type: "Medical Facility", typeAr: "مرفق طبي" },
];

function normalizeString(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
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
  const collection = db.collection("settings_locations");
  
  // 1. Robust cleanup of duplicates (case-insensitive)
  const allDocs = await collection.find({}).toArray();
  const seenNames = new Map();
  const duplicateIds = [];

  for (const doc of allDocs) {
    const normName = normalizeString(doc.name);
    if (seenNames.has(normName)) {
      duplicateIds.push(doc._id);
    } else {
      seenNames.set(normName, doc._id);
    }
  }

  if (duplicateIds.length > 0) {
    await collection.deleteMany({ _id: { $in: duplicateIds } });
    console.log(`[Seeding] Cleaned up ${duplicateIds.length} duplicate locations.`);
  }

  // 2. Ensure the new defaults are present and updated
  const now = new Date();
  for (const item of DEFAULT_SETTINGS_LOCATIONS) {
    const normName = normalizeString(item.name);
    // Find if it exists (case-insensitive)
    const existingDoc = await collection.findOne({ 
      name: { $regex: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } 
    });

    if (existingDoc) {
      // Update existing to match the official data
      await collection.updateOne(
        { _id: existingDoc._id },
        { 
          $set: { 
            name: item.name, // Reset to official casing
            nameAr: item.nameAr, 
            type: item.type, 
            typeAr: item.typeAr, 
            updatedAt: now 
          } 
        }
      );
    } else {
      // Insert new
      await collection.insertOne({
        ...item,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
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
    const nameAr = normalizeString(body.nameAr);
    const type = normalizeString(body.type);
    const typeAr = normalizeString(body.typeAr);

    if (!name || !type) {
      return res
        .status(400)
        .json({ success: false, error: "name and type are required" });
    }

    const now = new Date();
    const db = getDb();
    const result = await db.collection("settings_locations").insertOne({
      name,
      nameAr: nameAr || name,
      type,
      typeAr: typeAr || type,
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
    if (typeof req.body?.nameAr === "string") {
      updates.nameAr = normalizeString(req.body.nameAr);
    }
    if (typeof req.body?.type === "string") {
      updates.type = normalizeString(req.body.type);
    }
    if (typeof req.body?.typeAr === "string") {
      updates.typeAr = normalizeString(req.body.typeAr);
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
