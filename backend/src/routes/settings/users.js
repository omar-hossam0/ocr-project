import express from "express";
import { getDb } from "../../db.js";

const router = express.Router();

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
    error: "Manual user creation is disabled. Users come from real auth accounts.",
  });
});

router.patch("/:id", (_req, res) => {
  return res.status(405).json({
    success: false,
    error: "Manual user update is disabled. Users are synced from real auth accounts.",
  });
});

router.delete("/:id", (_req, res) => {
  return res.status(405).json({
    success: false,
    error: "Manual user deletion is disabled. Delete accounts from admin tools.",
  });
});

export default router;
