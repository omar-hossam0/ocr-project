import express from "express";
import { getDb, ObjectId } from "../../db.js";

const router = express.Router();

const DEFAULT_SETTINGS_DEPARTMENTS = [
  // Administrative Departments
  { name: "University Presidency", nameAr: "رئاسة الجامعة" },
  { name: "Admissions & Registration", nameAr: "القبول والتسجيل" },
  { name: "Student Affairs", nameAr: "شؤون الطلاب" },
  { name: "Financial Affairs", nameAr: "الشؤون المالية" },
  { name: "Human Resources", nameAr: "الموارد البشرية" },
  { name: "Information Technology (IT)", nameAr: "تكنولوجيا المعلومات" },
  { name: "Legal Affairs", nameAr: "الشؤون القانونية" },
  { name: "Public Relations & Media", nameAr: "العلاقات العامة والإعلام" },
  { name: "Quality Assurance Unit", nameAr: "وحدة ضمان الجودة" },
  { name: "Security & Safety", nameAr: "الأمن والسلامة" },
  { name: "General Administration", nameAr: "الإدارة العامة" },
  
  // Academic Faculties (Colleges)
  { name: "Faculty of Medicine", nameAr: "كلية الطب البشري" },
  { name: "Faculty of Oral & Dental Medicine", nameAr: "كلية طب الفم والأسنان" },
  { name: "Faculty of Pharmacy", nameAr: "كلية الصيدلة" },
  { name: "Faculty of Physical Therapy", nameAr: "كلية العلاج الطبيعي" },
  { name: "Faculty of Engineering", nameAr: "كلية الهندسة" },
  { name: "Faculty of Applied Health Sciences Technology", nameAr: "كلية تكنولوجيا العلوم الصحية التطبيقية" },
  { name: "Faculty of Business Administration", nameAr: "كلية إدارة الأعمال" },
  { name: "Faculty of Artificial Intelligence", nameAr: "كلية الذكاء الاصطناعي" },
  { name: "Faculty of Arts", nameAr: "كلية الآداب" },
  { name: "Faculty of Nursing", nameAr: "كلية التمريض" },
  { name: "Faculty of Veterinary Medicine", nameAr: "كلية الطب البيطري" },
  { name: "Faculty of Law", nameAr: "كلية الحقوق" },
  { name: "Faculty of Renewable Energy Engineering", nameAr: "كلية هندسة الطاقة المتجددة" },
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

async function seedDefaultDepartmentsIfEmpty(db) {
  const collection = db.collection("settings_departments");

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
    console.log(`[Seeding] Cleaned up ${duplicateIds.length} duplicate departments.`);
  }

  // 2. Remove old official departments that are no longer in our list (if they have no files)
  const officialNames = DEFAULT_SETTINGS_DEPARTMENTS.map(d => normalizeString(d.name));
  const currentData = await collection.find({}).toArray();
  
  for (const doc of currentData) {
    const normName = normalizeString(doc.name);
    if (!officialNames.includes(normName) && (doc.filesCount === 0 || !doc.filesCount)) {
      // This is likely an old default that we want to replace
      await collection.deleteOne({ _id: doc._id });
    }
  }

  // 3. Ensure the new defaults are present and updated
  const now = new Date();
  for (const item of DEFAULT_SETTINGS_DEPARTMENTS) {
    const normName = normalizeString(item.name);
    const existingDoc = await collection.findOne({ 
      name: { $regex: new RegExp(`^${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") } 
    });

    if (existingDoc) {
      await collection.updateOne(
        { _id: existingDoc._id },
        { 
          $set: { 
            name: item.name, 
            nameAr: item.nameAr, 
            updatedAt: now 
          } 
        }
      );
    } else {
      await collection.insertOne({
        ...item,
        filesCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
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
    const nameAr = normalizeString(body.nameAr);
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "name is required" });
    }

    const now = new Date();
    const db = getDb();
    const result = await db.collection("settings_departments").insertOne({
      name,
      nameAr: nameAr || name,
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
    if (typeof req.body?.nameAr === "string") {
      updates.nameAr = normalizeString(req.body.nameAr);
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
