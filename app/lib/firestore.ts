import { db, storage } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// File types
export interface FileData {
  id?: string;
  name: string;
  originalName: string;
  location: string;
  physicalLocation?: string;
  department: string;
  fileType: string;
  documentType?: string;
  uploadedBy: string;
  uploadedAt: Date;
  modifiedAt: Date;
  modifiedBy: string;
  tags: string[];
  notes: string;
  ocrText: string;
  storageUrl?: string;
  fileSize: number;
  status?: "available" | "checked_out" | "in_archive" | "processing" | "failed";
}

/**
 * ✅ Add new file to Firestore
 */
export async function addFile(fileData: FileData) {
  try {
    const normalizedLocation = fileData.physicalLocation || fileData.location;

    const docRef = await addDoc(collection(db, "files"), {
      ...fileData,
      location: normalizedLocation,
      physicalLocation: normalizedLocation,
      documentType: fileData.documentType || fileData.fileType,
      uploadedAt: Timestamp.fromDate(fileData.uploadedAt),
      modifiedAt: Timestamp.fromDate(fileData.modifiedAt),
      status: fileData.status || "available",
      views: 0,
      downloads: 0,
    });

    console.log("✅ File added:", docRef.id);

    clearFilesCache();

    // Keep metadata save fast; stats update runs best-effort in background.
    void updateFileStats("add", fileData.department).catch((error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Could not update stats";
      console.warn("⚠️ Background stats update failed:", errorMessage);
    });

    return docRef.id;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save file";
    console.error("❌ Error adding file:", error);
    throw new Error(`Failed to save file: ${errorMessage}`);
  }
}

// Cache for all files with TTL
let filesCache: {
  data: (FileData & { id: string })[];
  timestamp: number;
} | null = null;
const FILES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * ✅ Get all files with caching
 */
export async function getAllFiles(forceFresh: boolean = false) {
  try {
    // Return cached result if still valid
    if (
      !forceFresh &&
      filesCache &&
      Date.now() - filesCache.timestamp < FILES_CACHE_TTL
    ) {
      console.log("✅ Returning cached files");
      return filesCache.data;
    }

    const q = query(
      collection(db, "files"),
      orderBy("uploadedAt", "desc"),
      limit(500),
    );
    const querySnapshot = await getDocs(q);

    const files = querySnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })) as (FileData & { id: string })[];

    // Cache the results
    filesCache = { data: files, timestamp: Date.now() };

    console.log("✅ Retrieved", files.length, "files");
    return files;
  } catch (error: unknown) {
    // If collection doesn't exist or permission denied, return empty array
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch files";

    if (
      errorMessage.includes("not-found") ||
      errorMessage.includes("Permission denied")
    ) {
      console.warn(
        "⚠️ Firestore collection not found or permission denied. Returning empty array.",
      );
      return [];
    }

    console.error("❌ Error fetching files:", error);
    throw new Error(`Failed to fetch files: ${errorMessage}`);
  }
}

/**
 * ✅ Get recent files with pagination
 */
export async function getRecentFiles(pageSize: number = 10) {
  try {
    const q = query(
      collection(db, "files"),
      orderBy("uploadedAt", "desc"),
      limit(pageSize),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })) as (FileData & { id: string })[];
  } catch (error: unknown) {
    console.error("❌ Error fetching recent files:", error);
    return [];
  }
}

/**
 * ✅ Clear caches when needed
 */
export function clearFilesCache() {
  filesCache = null;
  searchCache.clear();
}

/**
 * ✅ Get files with filters
 */
export async function getFilteredFiles(constraints: QueryConstraint[]) {
  try {
    const q = query(collection(db, "files"), ...constraints);
    const querySnapshot = await getDocs(q);

    const files = querySnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })) as (FileData & { id: string })[];

    return files;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch filtered files";
    console.error("❌ Error fetching filtered files:", error);
    throw new Error(`Failed to fetch filtered files: ${errorMessage}`);
  }
}

// Simple in-memory cache for search results
const searchCache = new Map<
  string,
  { data: (FileData & { id: string })[]; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * ✅ Search files by keyword (name, OCR text, tags) with caching
 */
export async function searchFiles(
  keyword: string,
  limit: number = 100,
  forceFresh: boolean = false,
) {
  try {
    const cacheKey = `search:${keyword.toLowerCase()}`;
    const cached = searchCache.get(cacheKey);

    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("✅ Returning cached search results for:", keyword);
      return cached.data.slice(0, limit);
    }

    const allFiles = await getAllFiles(forceFresh);
    const searchTerm = keyword.toLowerCase();

    const results = allFiles.filter((file) => {
      const fileName = (file.name || "").toLowerCase();
      const ocrText = (file.ocrText || "").toLowerCase();
      const tags = Array.isArray(file.tags) ? file.tags : [];
      const location = (
        file.physicalLocation ||
        file.location ||
        ""
      ).toLowerCase();
      const documentType = (
        file.documentType ||
        file.fileType ||
        ""
      ).toLowerCase();

      return (
        fileName.includes(searchTerm) ||
        ocrText.includes(searchTerm) ||
        location.includes(searchTerm) ||
        documentType.includes(searchTerm) ||
        tags.some((tag) => tag.toLowerCase().includes(searchTerm))
      );
    });

    // Cache the results
    searchCache.set(cacheKey, { data: results, timestamp: Date.now() });

    console.log("✅ Found", results.length, "matching files for:", keyword);
    return results.slice(0, limit);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Search failed";
    console.error("❌ Error searching files:", error);
    throw new Error(`Search failed: ${errorMessage}`);
  }
}

export interface SearchResultItem {
  id: string;
  fileName: string;
  documentType: string;
  physicalLocation: string;
  ocrPreview: string;
  matchField: "name" | "ocrText" | "location" | "documentType" | "tags";
}

function buildOcrPreview(ocrText: string, keyword: string, maxLength: number) {
  if (!ocrText) {
    return "";
  }

  const source = ocrText.replace(/\s+/g, " ").trim();
  if (!source) {
    return "";
  }

  const lowerText = source.toLowerCase();
  const lowerKeyword = keyword.toLowerCase().trim();
  const index = lowerKeyword ? lowerText.indexOf(lowerKeyword) : -1;

  if (index === -1) {
    return source.slice(0, maxLength);
  }

  const halfWindow = Math.floor(maxLength / 2);
  const start = Math.max(0, index - halfWindow);
  const end = Math.min(source.length, start + maxLength);
  const snippet = source.slice(start, end);

  const prefix = start > 0 ? "..." : "";
  const suffix = end < source.length ? "..." : "";
  return `${prefix}${snippet}${suffix}`;
}

/**
 * Search files and return compact payload suitable for OCR search UI.
 */
export async function searchFilesWithPreview(
  keyword: string,
  options?: { limit?: number; previewLength?: number; forceFresh?: boolean },
): Promise<SearchResultItem[]> {
  const results = await searchFiles(
    keyword,
    options?.limit || 100,
    options?.forceFresh || false,
  );
  const searchTerm = keyword.toLowerCase();
  const previewLength = Math.max(40, options?.previewLength || 120);

  return results.map((file) => {
    const name = file.name || "";
    const ocrText = file.ocrText || "";
    const location = file.physicalLocation || file.location || "Unknown";
    const documentType = file.documentType || file.fileType || "Unknown";
    const tags = Array.isArray(file.tags) ? file.tags : [];

    let matchField: SearchResultItem["matchField"] = "ocrText";
    if (name.toLowerCase().includes(searchTerm)) {
      matchField = "name";
    } else if (location.toLowerCase().includes(searchTerm)) {
      matchField = "location";
    } else if (documentType.toLowerCase().includes(searchTerm)) {
      matchField = "documentType";
    } else if (tags.some((tag) => tag.toLowerCase().includes(searchTerm))) {
      matchField = "tags";
    }

    return {
      id: file.id || "",
      fileName: name,
      documentType,
      physicalLocation: location,
      ocrPreview: buildOcrPreview(ocrText, keyword, previewLength),
      matchField,
    };
  });
}

/**
 * ✅ Get files by department
 */
export async function getFilesByDepartment(department: string) {
  try {
    const q = query(
      collection(db, "files"),
      where("department", "==", department),
      orderBy("uploadedAt", "desc"),
    );

    const querySnapshot = await getDocs(q);
    const files = querySnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })) as (FileData & { id: string })[];

    console.log(`✅ Retrieved ${files.length} files from ${department}`);
    return files;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch department files";
    console.error("❌ Error getting files by department:", error);
    throw new Error(`Failed to fetch department files: ${errorMessage}`);
  }
}

// Get single file
export async function getFile(
  id: string,
): Promise<(FileData & { id: string }) | null> {
  try {
    const docRef = doc(db, "files", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists()
      ? ({ id: docSnap.id, ...docSnap.data() } as FileData & { id: string })
      : null;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch file";
    console.error("Error fetching file:", error);
    throw new Error(`Failed to fetch file: ${errorMessage}`);
  }
}

// Update file
export async function updateFile(id: string, updates: Partial<FileData>) {
  try {
    const docRef = doc(db, "files", id);
    await updateDoc(docRef, {
      ...updates,
      modifiedAt: new Date(),
    });
    clearFilesCache();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update file";
    console.error("Error updating file:", error);
    throw new Error(`Failed to update file: ${errorMessage}`);
  }
}

// Delete file
export async function deleteFile(id: string, storagePath?: string) {
  try {
    // Delete from storage if path provided
    if (storagePath) {
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
    }

    // Delete from firestore
    const docRef = doc(db, "files", id);
    await deleteDoc(docRef);
    clearFilesCache();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete file";
    console.error("Error deleting file:", error);
    throw new Error(`Failed to delete file: ${errorMessage}`);
  }
}

// Upload file to storage
export async function uploadFileToStorage(
  file: File,
  userId: string,
  fileName: string,
  options?: {
    timeoutMs?: number;
    onProgress?: (progressPercent: number) => void;
  },
) {
  const timeoutMs = Math.max(30000, Number(options?.timeoutMs || 180000));
  const safeName = fileName.replace(/\s+/g, "_");

  try {
    const storageRef = ref(
      storage,
      `uploads/${userId}/${Date.now()}_${safeName}`,
    );
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || undefined,
    });

    return await new Promise<{ path: string; url: string }>(
      (resolve, reject) => {
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

        const resetStallTimer = () => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          timeoutHandle = setTimeout(() => {
            uploadTask.cancel();
            reject(
              new Error(
                `Storage upload stalled after ${Math.round(timeoutMs / 1000)}s`,
              ),
            );
          }, timeoutMs);
        };

        options?.onProgress?.(0);
        resetStallTimer();

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              snapshot.totalBytes > 0
                ? Math.round(
                    (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
                  )
                : 0;
            options?.onProgress?.(progress);
            resetStallTimer();
          },
          (error: unknown) => {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
            }
            const storageCode =
              typeof error === "object" && error && "code" in error
                ? String((error as { code?: string }).code)
                : "storage/unknown";
            const storageMessage =
              error instanceof Error ? error.message : "Storage upload failed";
            reject(
              new Error(
                `Storage upload failed (${storageCode}): ${storageMessage}`,
              ),
            );
          },
          async () => {
            if (timeoutHandle) {
              clearTimeout(timeoutHandle);
            }
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              options?.onProgress?.(100);
              resolve({
                path: uploadTask.snapshot.ref.fullPath,
                url: downloadUrl,
              });
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : "Could not obtain storage download URL";
              reject(
                new Error(
                  `Storage upload finished but URL fetch failed: ${errorMessage}`,
                ),
              );
            }
          },
        );
      },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload file";
    console.error("Error uploading file:", error);
    throw new Error(errorMessage);
  }
}

// Tracking/Logs
export interface TrackingLog {
  id?: string;
  fileId: string;
  fileName: string;
  action: "checked_out" | "returned" | "updated" | "deleted";
  user: string;
  userDepartment: string;
  timestamp: Date;
}

export async function addTrackingLog(log: TrackingLog) {
  try {
    await addDoc(collection(db, "tracking"), {
      ...log,
      timestamp: new Date(),
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to add tracking log";
    console.error("Error adding tracking log:", error);
    throw new Error(`Failed to add tracking log: ${errorMessage}`);
  }
}

export async function getTrackingLogs(
  fileId?: string,
  limit_rows: number = 100,
) {
  try {
    let q;
    if (fileId) {
      q = query(
        collection(db, "tracking"),
        where("fileId", "==", fileId),
        orderBy("timestamp", "desc"),
        limit(limit_rows),
      );
    } else {
      q = query(
        collection(db, "tracking"),
        orderBy("timestamp", "desc"),
        limit(limit_rows),
      );
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (TrackingLog & { id: string })[];
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch tracking logs";
    console.error("Error fetching tracking logs:", error);
    throw new Error(`Failed to fetch tracking logs: ${errorMessage}`);
  }
}

export type FileTransactionAction = "taken" | "returned" | "moved";

export interface FileTransaction {
  id?: string;
  fileId: string;
  userId: string;
  userName?: string;
  action: FileTransactionAction;
  fromLocation: string;
  toLocation: string;
  dateTime: Date;
  note?: string;
}

interface CreateFileTransactionInput {
  fileId: string;
  userId: string;
  userName?: string;
  action: FileTransactionAction;
  fromLocation?: string;
  toLocation?: string;
  note?: string;
}

/**
 * Record a movement/checkout transaction and keep file status/location updated.
 */
export async function addFileTransaction(input: CreateFileTransactionInput) {
  const now = new Date();
  const file = await getFile(input.fileId);

  if (!file) {
    throw new Error("File not found");
  }

  const currentLocation =
    (file.physicalLocation as string) || (file.location as string) || "Unknown";
  const fromLocation = input.fromLocation || currentLocation;
  const toLocation = input.toLocation || currentLocation;

  const transactionData = {
    fileId: input.fileId,
    userId: input.userId,
    userName: input.userName || "",
    action: input.action,
    fromLocation,
    toLocation,
    note: input.note || "",
    dateTime: Timestamp.fromDate(now),
    createdAt: Timestamp.fromDate(now),
  };

  const transactionRef = await addDoc(
    collection(db, "fileTransactions"),
    transactionData,
  );

  const fileRef = doc(db, "files", input.fileId);
  const updates: Record<string, unknown> = {
    modifiedAt: Timestamp.fromDate(now),
    modifiedBy: input.userName || input.userId,
  };

  if (input.action === "taken") {
    updates.status = "checked_out";
  }

  if (input.action === "returned") {
    updates.status = "available";
    updates.location = toLocation;
    updates.physicalLocation = toLocation;
  }

  if (input.action === "moved") {
    updates.status = "available";
    updates.location = toLocation;
    updates.physicalLocation = toLocation;
  }

  await updateDoc(fileRef, updates);

  const mappedAction: TrackingLog["action"] =
    input.action === "taken"
      ? "checked_out"
      : input.action === "returned"
        ? "returned"
        : "updated";

  await addTrackingLog({
    fileId: input.fileId,
    fileName: (file.name as string) || "Unknown",
    action: mappedAction,
    user: input.userName || input.userId,
    userDepartment: (file.department as string) || "Unknown",
    timestamp: now,
  });

  return transactionRef.id;
}

export async function getFileTransactions(options?: {
  fileId?: string;
  userId?: string;
  action?: FileTransactionAction;
  limitRows?: number;
}) {
  const constraints: QueryConstraint[] = [orderBy("dateTime", "desc")];

  if (options?.fileId) {
    constraints.push(where("fileId", "==", options.fileId));
  }

  if (options?.userId) {
    constraints.push(where("userId", "==", options.userId));
  }

  if (options?.action) {
    constraints.push(where("action", "==", options.action));
  }

  constraints.push(limit(options?.limitRows || 100));

  const q = query(collection(db, "fileTransactions"), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as (FileTransaction & { id: string })[];
}

// ✅ FIRESTORE - STATISTICS & ANALYTICS

/**
 * Update file statistics in Firestore
 */
async function updateFileStats(action: string, department: string) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const statsDocRef = doc(db, "statistics", "daily");

    // Get current daily stats
    const statsDoc = await getDoc(statsDocRef);
    const dates = statsDoc.exists() ? statsDoc.data().dates || {} : {};

    // Update or create today's stats
    const todayStats = dates[today] || {
      uploads: 0,
      departments: {},
    };

    if (action === "add") {
      todayStats.uploads = (todayStats.uploads || 0) + 1;
      todayStats.departments[department] =
        (todayStats.departments[department] || 0) + 1;
    }

    dates[today] = todayStats;

    // Save updated stats
    await updateDoc(statsDocRef, {
      dates,
      lastUpdate: Timestamp.now(),
    }).catch(async () => {
      // If document doesn't exist, create it
      await updateDoc(statsDocRef, {
        dates,
        lastUpdate: Timestamp.now(),
      }).catch(async (err: unknown) => {
        const firestoreError = err as { code?: string };
        if (firestoreError.code === "not-found") {
          await addDoc(collection(db, "statistics"), {
            docType: "daily",
            dates,
            createdAt: Timestamp.now(),
            lastUpdate: Timestamp.now(),
          });
        }
      });
    });

    console.log("✅ Stats updated for", department);

    // Also update all-time stats
    await updateAllTimeStats(department);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Could not update stats";
    console.warn("⚠️ Could not update stats:", errorMessage);
  }
}

/**
 * Update all-time statistics
 */
async function updateAllTimeStats(department: string) {
  try {
    const allTimeDocRef = doc(db, "statistics", "allTime");
    const allTimeDoc = await getDoc(allTimeDocRef);

    const stats = allTimeDoc.exists()
      ? allTimeDoc.data()
      : {
          totalUploads: 0,
          departmentBreakdown: {},
        };

    stats.totalUploads = (stats.totalUploads || 0) + 1;
    stats.departmentBreakdown[department] =
      (stats.departmentBreakdown[department] || 0) + 1;

    await updateDoc(allTimeDocRef, {
      ...stats,
      lastUpdate: Timestamp.now(),
    }).catch(async (err: unknown) => {
      const firestoreError = err as { code?: string };
      // If document doesn't exist, create it
      if (firestoreError.code === "not-found") {
        await addDoc(collection(db, "statistics"), {
          docType: "allTime",
          ...stats,
          createdAt: Timestamp.now(),
          lastUpdate: Timestamp.now(),
        });
      }
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Could not update all-time stats";
    console.warn("⚠️ Could not update all-time stats:", errorMessage);
  }
}

/**
 * Get daily statistics
 */
export async function getDailyStats(date?: string) {
  try {
    const statsDate = date || new Date().toISOString().split("T")[0];
    const statsDocRef = doc(db, "statistics", "daily");
    const statsDoc = await getDoc(statsDocRef);

    if (!statsDoc.exists()) {
      console.log("📊 No stats for", statsDate);
      return {
        uploads: 0,
        departments: {},
        date: statsDate,
      };
    }

    const dates = statsDoc.data().dates || {};
    const todayStats = dates[statsDate] || {
      uploads: 0,
      departments: {},
    };

    return {
      ...todayStats,
      date: statsDate,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch daily stats";
    console.error("❌ Error getting daily stats:", error);
    throw new Error(`Failed to fetch daily stats: ${errorMessage}`);
  }
}

/**
 * Get all-time statistics
 */
export async function getAllTimeStats() {
  try {
    const allTimeDocRef = doc(db, "statistics", "allTime");
    const allTimeDoc = await getDoc(allTimeDocRef);

    if (!allTimeDoc.exists()) {
      return {
        totalUploads: 0,
        departmentBreakdown: {},
      };
    }

    const data = allTimeDoc.data();
    console.log("✅ All-time stats:", data.totalUploads, "uploads");
    return {
      totalUploads: data.totalUploads || 0,
      departmentBreakdown: data.departmentBreakdown || {},
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch all-time stats";
    console.error("❌ Error getting all-time stats:", error);
    throw new Error(`Failed to fetch all-time stats: ${errorMessage}`);
  }
}

// ✅ USER PROFILE

export interface UserProfile {
  uid?: string;
  email?: string;
  displayName: string;
  department: string;
  role: string;
  photoURL?: string;
  bio?: string;
  phone?: string;
  lastLoginAt?: Date;
  updatedAt?: Date;
}

export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, "users", userId);
    const snap = await getDoc(docRef);
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (error: unknown) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

export async function saveUserProfile(
  userId: string,
  data: Partial<UserProfile>,
): Promise<void> {
  try {
    // Filter out undefined/null values (Firestore doesn't allow them)
    const cleanData = Object.fromEntries(
      Object.entries(data).filter((entry) => entry[1] != null),
    );
    const docRef = doc(db, "users", userId);
    await setDoc(
      docRef,
      { ...cleanData, updatedAt: new Date() },
      { merge: true },
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save profile";
    throw new Error(`Failed to save profile: ${errorMessage}`);
  }
}

export async function uploadProfilePhoto(
  file: File,
  userId: string,
): Promise<string> {
  try {
    const storageRef = ref(storage, `profiles/${userId}/avatar`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload photo";
    throw new Error(`Failed to upload photo: ${errorMessage}`);
  }
}

export function uploadProfilePhotoResumable(
  file: File,
  userId: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("File size exceeds 5MB limit"));
      return;
    }

    const storageRef = ref(storage, `profiles/${userId}/avatar`);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || "image/jpeg",
    });

    task.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        );
        onProgress(Math.min(pct, 99)); // Cap at 99% until complete
      },
      (error: unknown) => {
        const typedError = error as { message?: string };
        const msg = typedError?.message || "Upload failed";
        reject(
          new Error(
            msg.includes("CORS") || msg.includes("401") || msg.includes("403")
              ? `Storage access denied. Check Firebase rules (Auth token: ${userId})`
              : `Upload failed: ${msg}`,
          ),
        );
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          onProgress(100);
          resolve(url);
        } catch (error: unknown) {
          const typedError = error as { message?: string };
          reject(
            new Error(
              `Failed to get download URL: ${typedError?.message || "Unknown error"}`,
            ),
          );
        }
      },
    );
  });
}

// ✅ SETTINGS

export interface StorageLocationSetting {
  id?: string;
  name: string;
  type: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DepartmentSetting {
  id?: string;
  name: string;
  filesCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SettingsUser {
  id?: string;
  name: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SystemSettings {
  fileExpirationDays: number;
  notifyOnFileExpiration: boolean;
  notifyOnFileCheckout: boolean;
  dailySummaryEmail: boolean;
  maxUploadSizeMb: number;
  updatedAt?: Date;
}

function normalizeString(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

const DEFAULT_SETTINGS_LOCATIONS: Array<{ name: string; type: string }> = [
  { name: "Cabinet A - Drawer 1", type: "Cabinet" },
  { name: "Cabinet A - Drawer 2", type: "Cabinet" },
  { name: "Cabinet A - Drawer 3", type: "Cabinet" },
  { name: "Cabinet B - Drawer 1", type: "Cabinet" },
  { name: "Office 1 - Shelf A", type: "Office" },
  { name: "Office 2 - Shelf B", type: "Office" },
  { name: "Storage Room 1", type: "Storage" },
  { name: "Storage Room 2", type: "Storage" },
];

const DEFAULT_SETTINGS_DEPARTMENTS: string[] = [
  "Legal",
  "HR",
  "Finance",
  "Operations",
  "IT",
  "Administration",
];

async function seedDefaultLocationsIfEmpty() {
  const collectionRef = collection(db, "settings_locations");
  const existing = await getDocs(query(collectionRef, limit(1)));

  if (!existing.empty) {
    return;
  }

  const now = Timestamp.now();
  await Promise.all(
    DEFAULT_SETTINGS_LOCATIONS.map((item, index) =>
      setDoc(doc(db, "settings_locations", `default-${index + 1}`), {
        name: item.name,
        type: item.type,
        createdAt: now,
        updatedAt: now,
      }),
    ),
  );
}

async function seedDefaultDepartmentsIfEmpty() {
  const collectionRef = collection(db, "settings_departments");
  const existing = await getDocs(query(collectionRef, limit(1)));

  if (!existing.empty) {
    return;
  }

  const now = Timestamp.now();
  await Promise.all(
    DEFAULT_SETTINGS_DEPARTMENTS.map((name, index) =>
      setDoc(doc(db, "settings_departments", `default-${index + 1}`), {
        name,
        filesCount: 0,
        createdAt: now,
        updatedAt: now,
      }),
    ),
  );
}

// Locations
export async function getSettingsLocations() {
  await seedDefaultLocationsIfEmpty();

  const q = query(collection(db, "settings_locations"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as (StorageLocationSetting & { id: string })[];
}

export async function addSettingsLocation(
  payload: Omit<StorageLocationSetting, "id" | "createdAt" | "updatedAt">,
) {
  const name = normalizeString(payload.name || "");
  const type = normalizeString(payload.type || "");

  if (!name || !type) {
    throw new Error("Location name and type are required");
  }

  const refDoc = await addDoc(collection(db, "settings_locations"), {
    name,
    type,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return refDoc.id;
}

export async function updateSettingsLocation(
  id: string,
  payload: Partial<StorageLocationSetting>,
) {
  const updates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (typeof payload.name === "string") {
    updates.name = normalizeString(payload.name);
  }
  if (typeof payload.type === "string") {
    updates.type = normalizeString(payload.type);
  }

  await updateDoc(doc(db, "settings_locations", id), updates);
}

export async function deleteSettingsLocation(id: string) {
  await deleteDoc(doc(db, "settings_locations", id));
}

// Departments
export async function getSettingsDepartments() {
  await seedDefaultDepartmentsIfEmpty();

  const q = query(
    collection(db, "settings_departments"),
    orderBy("name", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as (DepartmentSetting & { id: string })[];
}

export async function addSettingsDepartment(
  payload: Omit<DepartmentSetting, "id" | "createdAt" | "updatedAt">,
) {
  const name = normalizeString(payload.name || "");
  if (!name) {
    throw new Error("Department name is required");
  }

  const refDoc = await addDoc(collection(db, "settings_departments"), {
    name,
    filesCount: Number(payload.filesCount || 0),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return refDoc.id;
}

export async function updateSettingsDepartment(
  id: string,
  payload: Partial<DepartmentSetting>,
) {
  const updates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (typeof payload.name === "string") {
    updates.name = normalizeString(payload.name);
  }
  if (typeof payload.filesCount === "number") {
    updates.filesCount = payload.filesCount;
  }

  await updateDoc(doc(db, "settings_departments", id), updates);
}

export async function deleteSettingsDepartment(id: string) {
  await deleteDoc(doc(db, "settings_departments", id));
}

// Users in settings management
export async function getSettingsUsers() {
  const q = query(collection(db, "settings_users"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as (SettingsUser & { id: string })[];
}

export async function addSettingsUser(
  payload: Omit<SettingsUser, "id" | "createdAt" | "updatedAt">,
) {
  const name = normalizeString(payload.name || "");
  const email = normalizeString(payload.email || "").toLowerCase();
  const role = payload.role;

  if (!name || !email || !role) {
    throw new Error("User name, email, and role are required");
  }

  const refDoc = await addDoc(collection(db, "settings_users"), {
    name,
    email,
    role,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return refDoc.id;
}

export async function updateSettingsUser(
  id: string,
  payload: Partial<SettingsUser>,
) {
  const updates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (typeof payload.name === "string") {
    updates.name = normalizeString(payload.name);
  }
  if (typeof payload.email === "string") {
    updates.email = normalizeString(payload.email).toLowerCase();
  }
  if (payload.role) {
    updates.role = payload.role;
  }

  await updateDoc(doc(db, "settings_users", id), updates);
}

export async function deleteSettingsUser(id: string) {
  await deleteDoc(doc(db, "settings_users", id));
}

export type AccountSettingsUser = {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
};

export async function getSettingsUsersFromAccounts(): Promise<
  AccountSettingsUser[]
> {
  const snap = await getDocs(collection(db, "users"));

  const data = snap.docs.map((item) => {
    const row = item.data() as Partial<UserProfile>;
    const email = (row.email || "").trim().toLowerCase();
    const displayName = (row.displayName || "").trim();
    const fallbackName = email ? email.split("@")[0] : "User";
    const rawRole = (row.role || "Viewer").trim();
    const role =
      rawRole === "Admin" || rawRole === "Editor" || rawRole === "Viewer"
        ? rawRole
        : "Viewer";

    return {
      id: item.id,
      name: displayName || fallbackName,
      email,
      role,
    } as AccountSettingsUser;
  });

  return data.sort((a, b) => a.name.localeCompare(b.name));
}

// System settings (single document)
const SYSTEM_SETTINGS_DOC_ID = "global";

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  fileExpirationDays: 365,
  notifyOnFileExpiration: true,
  notifyOnFileCheckout: true,
  dailySummaryEmail: false,
  maxUploadSizeMb: 50,
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const refDoc = doc(db, "settings_system", SYSTEM_SETTINGS_DOC_ID);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) {
    await setDoc(refDoc, {
      ...DEFAULT_SYSTEM_SETTINGS,
      updatedAt: Timestamp.now(),
    });
    return DEFAULT_SYSTEM_SETTINGS;
  }

  const data = snap.data() as Partial<SystemSettings>;
  return {
    fileExpirationDays: Number(data.fileExpirationDays ?? 365),
    notifyOnFileExpiration: Boolean(data.notifyOnFileExpiration ?? true),
    notifyOnFileCheckout: Boolean(data.notifyOnFileCheckout ?? true),
    dailySummaryEmail: Boolean(data.dailySummaryEmail ?? false),
    maxUploadSizeMb: Number(data.maxUploadSizeMb ?? 50),
  };
}

export async function updateSystemSettings(payload: Partial<SystemSettings>) {
  const refDoc = doc(db, "settings_system", SYSTEM_SETTINGS_DOC_ID);
  await setDoc(
    refDoc,
    {
      ...payload,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}
