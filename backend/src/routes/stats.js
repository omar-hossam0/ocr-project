import express from "express";
import { getDb } from "../db.js";

const router = express.Router();

async function getDailyStats(db, date) {
  const statsDate = date || new Date().toISOString().split("T")[0];
  const statsDoc = await db.collection("statistics").findOne({ _id: "daily" });

  if (!statsDoc) {
    return { uploads: 0, departments: {}, date: statsDate };
  }

  const dates = statsDoc.dates || {};
  const todayStats = dates[statsDate] || { uploads: 0, departments: {} };

  return { ...todayStats, date: statsDate };
}

async function getAllTimeStats(db) {
  const statsDoc = await db.collection("statistics").findOne({ _id: "allTime" });

  if (!statsDoc) {
    return { totalUploads: 0, departmentBreakdown: {} };
  }

  return {
    totalUploads: statsDoc.totalUploads || 0,
    departmentBreakdown: statsDoc.departmentBreakdown || {},
  };
}

router.get("/", async (req, res) => {
  try {
    const type = String(req.query.type || "daily");
    const date = req.query.date ? String(req.query.date) : undefined;

    const db = getDb();
    const data =
      type === "all-time" ? await getAllTimeStats(db) : await getDailyStats(db, date);

    return res.json({
      success: true,
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch statistics";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
