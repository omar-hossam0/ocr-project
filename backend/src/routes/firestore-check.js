import express from "express";
import { getDb } from "../db.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const result = {
    mongodbExists: false,
    canRead: false,
    canWrite: false,
    error: undefined,
    message: "Checking MongoDB...",
  };

  try {
    const db = getDb();
    await db.admin().ping();
    result.mongodbExists = true;

    try {
      await db.collection("test_collection").findOne();
      result.canRead = true;
    } catch (readError) {
      const err = readError instanceof Error ? readError : undefined;
      result.error = err?.message || "Read failed";
    }

    if (result.canRead) {
      try {
        const doc = await db.collection("test_collection").insertOne({
          test: true,
          timestamp: new Date().toISOString(),
          message: "This is a test document",
        });
        await db
          .collection("test_collection")
          .deleteOne({ _id: doc.insertedId });
        result.canWrite = true;
      } catch (writeError) {
        const err = writeError instanceof Error ? writeError : undefined;
        result.error = err?.message || "Write failed";
      }
    }

    if (result.mongodbExists && result.canRead && result.canWrite) {
      result.message = "MongoDB is properly configured and ready to use";
    } else if (result.mongodbExists && result.canRead) {
      result.message =
        "MongoDB exists with read access, but write permission is missing";
    } else if (!result.mongodbExists) {
      result.message = "MongoDB is not reachable";
    } else {
      result.message = "Cannot connect to MongoDB";
    }
  } catch (error) {
    const err = error instanceof Error ? error : undefined;
    result.error = err?.message || String(error);
    result.message = "Error checking MongoDB status";
  }

  return res.json(result);
});

export default router;
