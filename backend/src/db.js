import { MongoClient, GridFSBucket, ObjectId } from "mongodb";

let client;
let db;
let bucket;

function parseTimeoutMs(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isTruthyEnv(value) {
  if (!value) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export async function connectDb() {
  if (db && bucket) {
    return { db, bucket };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  if (!client) {
    const mongoOptions = {
      serverSelectionTimeoutMS: parseTimeoutMs(
        process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
        10000,
      ),
      connectTimeoutMS: parseTimeoutMs(
        process.env.MONGODB_CONNECT_TIMEOUT_MS,
        10000,
      ),
    };

    const tlsCAFile = process.env.MONGODB_TLS_CA_FILE;
    if (tlsCAFile) {
      mongoOptions.tls = true;
      mongoOptions.tlsCAFile = tlsCAFile;
    }

    if (isTruthyEnv(process.env.MONGODB_TLS_INSECURE)) {
      mongoOptions.tls = true;
      mongoOptions.tlsAllowInvalidCertificates = true;
      mongoOptions.tlsAllowInvalidHostnames = true;
    }

    client = new MongoClient(uri, mongoOptions);
  }

  await client.connect();

  const dbName = process.env.MONGODB_DB;
  db = dbName ? client.db(dbName) : client.db();
  bucket = new GridFSBucket(db, { bucketName: "uploads" });

  return { db, bucket };
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call connectDb() first.");
  }
  return db;
}

export function getBucket() {
  if (!bucket) {
    throw new Error("GridFS bucket not initialized. Call connectDb() first.");
  }
  return bucket;
}

export function isDbReady() {
  return Boolean(db && bucket);
}

export { ObjectId };
