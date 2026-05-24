import express from "express";
import { getDb, isDbReady } from "../db.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  if (!isDbReady()) {
    return res.status(503).json({
      success: false,
      status: "degraded",
      mongodb: false,
      checks: {
        MongoDB: "not connected",
        "Last Check": new Date().toISOString(),
      },
      message: "MongoDB is not connected",
    });
  }

  try {
    const db = getDb();
    await db.admin().ping();

    return res.json({
      success: true,
      status: "healthy",
      mongodb: true,
      checks: {
        MongoDB: "ok",
        "Last Check": new Date().toISOString(),
      },
      message: "All MongoDB services are connected",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Health check failed";
    return res.status(500).json({
      success: false,
      status: "error",
      error: message,
    });
  }
});

export default router;
