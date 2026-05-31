import express from "express";
import bcrypt from "bcryptjs";
import { getDb, ObjectId } from "../db.js";
import { authMiddleware, signToken } from "../middleware/auth.js";

const router = express.Router();

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function buildUserResponse(userDoc) {
  return {
    id: userDoc._id.toString(),
    name: userDoc.name || "User",
    email: userDoc.email,
    role: userDoc.role || "Viewer",
    department: userDoc.department || "",
    photoURL: userDoc.photoURL || "",
  };
}

router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "email and password are required",
      });
    }

    const db = getDb();
    const user = await db.collection("users").findOne({ email });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }

    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role || "Viewer",
      name: user.name || "User",
    });

    return res.json({
      success: true,
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return res.status(500).json({ success: false, error: message });
  }
});

router.get("/me", authMiddleware({ required: true }), async (req, res) => {
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

    return res.json({ success: true, user: buildUserResponse(user) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load user";
    return res.status(500).json({ success: false, error: message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const name = String(req.body?.name || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters",
      });
    }

    const db = getDb();

    // Check if user already exists
    const existing = await db.collection("users").findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "This email is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.collection("users").insertOne({
      email,
      name: name || email.split("@")[0],
      role: "Viewer",
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = await db
      .collection("users")
      .findOne({ _id: result.insertedId });

    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: user.role || "Viewer",
      name: user.name || "User",
    });

    return res.json({
      success: true,
      token,
      user: buildUserResponse(user),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
