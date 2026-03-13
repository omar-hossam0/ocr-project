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
  department: string;
  fileType: string;
  uploadedBy: string;
  uploadedAt: Date;
  modifiedAt: Date;
  modifiedBy: string;
  tags: string[];
  notes: string;
  ocrText: string;
  storageUrl?: string;
  fileSize: number;
}

/**
 * ✅ Add new file to Firestore
 */
export async function addFile(fileData: FileData) {
  try {
    const docRef = await addDoc(collection(db, "files"), {
      ...fileData,
      uploadedAt: Timestamp.fromDate(fileData.uploadedAt),
      modifiedAt: Timestamp.fromDate(fileData.modifiedAt),
      status: "active",
      views: 0,
      downloads: 0,
    });

    console.log("✅ File added:", docRef.id);

    // Update realtime DB stats
    await updateFileStats("add", fileData.department);

    return docRef.id;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save file";
    console.error("❌ Error adding file:", error);
    throw new Error(`Failed to save file: ${errorMessage}`);
  }
}

// Cache for all files with TTL
let filesCache: { data: (FileData & { id: string })[]; timestamp: number } | null = null;
const FILES_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * ✅ Get all files with caching
 */
export async function getAllFiles(forceFresh: boolean = false) {
  try {
    // Return cached result if still valid
    if (!forceFresh && filesCache && Date.now() - filesCache.timestamp < FILES_CACHE_TTL) {
      console.log("✅ Returning cached files");
      return filesCache.data;
    }
    
    const q = query(collection(db, "files"), orderBy("uploadedAt", "desc"), limit(500));
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
const searchCache = new Map<string, { data: (FileData & { id: string })[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * ✅ Search files by keyword (name, OCR text, tags) with caching
 */
export async function searchFiles(keyword: string, limit: number = 100) {
  try {
    const cacheKey = `search:${keyword.toLowerCase()}`;
    const cached = searchCache.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("✅ Returning cached search results for:", keyword);
      return cached.data.slice(0, limit);
    }
    
    const allFiles = await getAllFiles();
    const searchTerm = keyword.toLowerCase();

    const results = allFiles.filter(
      (file) =>
        file.name.toLowerCase().includes(searchTerm) ||
        file.ocrText.toLowerCase().includes(searchTerm) ||
        file.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
    );

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
export async function getFile(id: string) {
  try {
    const docRef = doc(db, "files", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
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
) {
  try {
    const storageRef = ref(
      storage,
      `uploads/${userId}/${Date.now()}_${fileName}`,
    );
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { path: snapshot.ref.fullPath, url: downloadUrl };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to upload file";
    console.error("Error uploading file:", error);
    throw new Error(`Failed to upload file: ${errorMessage}`);
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
  displayName: string;
  department: string;
  role: string;
  photoURL?: string;
  bio?: string;
  phone?: string;
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
      Object.entries(data).filter(([_, v]) => v != null),
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
      (error: any) => {
        const msg = error?.message || "Upload failed";
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
        } catch (e: any) {
          reject(new Error(`Failed to get download URL: ${e?.message}`));
        }
      },
    );
  });
}
