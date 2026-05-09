import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { connectDb, getDb } from "./db.js";
import { authMiddleware } from "./middleware/auth.js";

import authRoutes from "./routes/auth.js";
import healthRoutes from "./routes/health.js";
import firestoreCheckRoutes from "./routes/firestore-check.js";
import filesRoutes from "./routes/files.js";
import uploadRoutes from "./routes/upload.js";
import storageRoutes from "./routes/storage.js";
import ocrRoutes from "./routes/ocr.js";
import ocrQueueRoutes from "./routes/ocr-queue.js";
import cameraOcrRoutes from "./routes/camera-ocr-v2.js";
import searchRoutes from "./routes/search.js";
import statsRoutes from "./routes/stats.js";
import trackingRoutes from "./routes/tracking.js";
import locationsRoutes from "./routes/settings/locations.js";
import departmentsRoutes from "./routes/settings/departments.js";
import systemRoutes from "./routes/settings/system.js";
import usersRoutes from "./routes/settings/users.js";

dotenv.config();

const app = express();

const originEnv = process.env.CORS_ORIGIN || "*";
const corsOrigins = originEnv.split(",").map((item) => item.trim());
const corsOrigin =
  corsOrigins.length === 1 && corsOrigins[0] === "*" ? "*" : corsOrigins;

app.use(
  cors({
    origin: corsOrigin,
    credentials: corsOrigin !== "*",
  }),
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 300,
  }),
);

app.use("/api/health", healthRoutes);
app.use("/api/firestore-check", firestoreCheckRoutes);
app.use("/api/auth", authRoutes);

app.use("/api", authMiddleware());

app.use("/api/files", filesRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/ocr/queue", ocrQueueRoutes);
app.use("/api/camera-ocr", cameraOcrRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/settings/locations", locationsRoutes);
app.use("/api/settings/departments", departmentsRoutes);
app.use("/api/settings/system", systemRoutes);
app.use("/api/settings/users", usersRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

async function ensureAdminUser() {
  const email = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!email || !password) return;

  const db = getDb();
  const existing = await db.collection("users").findOne({ email });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await db.collection("users").insertOne({
    name: process.env.ADMIN_NAME || "Admin",
    email,
    role: process.env.ADMIN_ROLE || "Admin",
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function start() {
  try {
    await connectDb();
    await ensureAdminUser();

    const port = Number(process.env.PORT || 4000);
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start server";
    console.error(message);
    process.exit(1);
  }
}

start();
