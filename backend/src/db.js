import { MongoClient, GridFSBucket, ObjectId } from "mongodb";

let client;
let db;
let bucket;

export async function connectDb() {
  if (db && bucket) {
    return { db, bucket };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }

  if (!client) {
    client = new MongoClient(uri);
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

export { ObjectId };
