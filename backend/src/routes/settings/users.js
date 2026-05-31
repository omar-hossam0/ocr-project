import express from "express";
import { getDb, ObjectId } from "../../db.js";

const router = express.Router();

function isAdmin(req) {
  return String(req.user?.role || "").toLowerCase() === "admin";
}

function normalizeString(value) {
  return String(value || "").trim();
}

function buildUserProfile(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    name: doc.name || "User",
    email: doc.email || "",
    role: doc.role || "Viewer",
    department: doc.department || "",
    phone: doc.phone || "",
    bio: doc.bio || "",
    photoURL: doc.photoURL || "",
    updatedAt: doc.updatedAt || undefined,
  };
}

router.get("/", async (_req, res) => {
  try {
    const db = getDb();
    const users = await db
      .collection("users")
      .find({})
      .sort({ name: 1 })
      .toArray();

    const data = users.map((user) => ({
      id: user._id.toString(),
      name: user.name || "User",
      email: user.email || "",
      role: user.role || "Viewer",
    }));

    return res.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch users";
    return res.status(500).json({ success: false, error: message });
  }
});

router.post("/", (_req, res) => {
  return res.status(405).json({
    success: false,
    error:
      "Manual user creation is disabled. Users come from real auth accounts.",
  });
});

router.get("/me", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const db = getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({ success: true, data: buildUserProfile(user) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch user profile";
    return res.status(500).json({ success: false, error: message });
  }
});

router.patch("/me", async (req, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const payload = req.body || {};
    const updates = {
      updatedAt: new Date(),
    };

    if (typeof payload.name === "string")
      updates.name = normalizeString(payload.name);
    if (typeof payload.displayName === "string")
      updates.name = normalizeString(payload.displayName);
    if (typeof payload.department === "string")
      updates.department = normalizeString(payload.department);
    if (typeof payload.phone === "string")
      updates.phone = normalizeString(payload.phone);
    if (typeof payload.bio === "string")
      updates.bio = normalizeString(payload.bio);
    if (typeof payload.photoURL === "string")
      updates.photoURL = payload.photoURL.trim();

    const db = getDb();
    await db
      .collection("users")
      .updateOne({ _id: new ObjectId(userId) }, { $set: updates });

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });
    return res.json({ success: true, data: buildUserProfile(user) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user profile";
    return res.status(500).json({ success: false, error: message });
  }
});

router.get(":id", async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.sub;
    if (!requesterId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid user id" });
    }

    if (!isAdmin(req) && requesterId !== id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const db = getDb();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.json({ success: true, data: buildUserProfile(user) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch user profile";
    return res.status(500).json({ success: false, error: message });
  }
});

router.patch(":id", async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.sub;
    if (!requesterId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid user id" });
    }

    const payload = req.body || {};
    const updates = {
      updatedAt: new Date(),
    };

    if (typeof payload.name === "string")
      updates.name = normalizeString(payload.name);
    if (typeof payload.displayName === "string")
      updates.name = normalizeString(payload.displayName);
    if (typeof payload.department === "string")
      updates.department = normalizeString(payload.department);
    if (typeof payload.phone === "string")
      updates.phone = normalizeString(payload.phone);
    if (typeof payload.bio === "string")
      updates.bio = normalizeString(payload.bio);
    if (typeof payload.photoURL === "string")
      updates.photoURL = payload.photoURL.trim();
    if (typeof payload.role === "string" && isAdmin(req))
      updates.role = normalizeString(payload.role);

    if (!isAdmin(req) && requesterId !== id) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const db = getDb();
    await db
      .collection("users")
      .updateOne({ _id: new ObjectId(id) }, { $set: updates });

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });
    return res.json({ success: true, data: buildUserProfile(user) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update user";
    return res.status(500).json({ success: false, error: message });
  }
});

router.delete("/:id", (_req, res) => {
  return res.status(405).json({
    success: false,
    error:
      "Manual user deletion is disabled. Delete accounts from admin tools.",
  });
});

export default router;
