// Adapter: forward Firestore-style calls to the Express backend (MongoDB)
// This file keeps the same exported function names used across the frontend
// but implements them by calling the REST API under NEXT_PUBLIC_BACKEND_URL.

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

function authHeaders(): Record<string, string> {
  const token =
    (typeof window !== "undefined" && window.localStorage.getItem("token")) ||
    undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  uploadedAt: Date | string;
  modifiedAt: Date | string;
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
  const url = `${BACKEND}/api/files`;
  const body = { ...fileData };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to add file");
    clearFilesCache();
    return json.id;
  } catch (err) {
    console.error("Error addFile -> backend:", err);
    throw err;
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
  if (
    !forceFresh &&
    filesCache &&
    Date.now() - filesCache.timestamp < FILES_CACHE_TTL
  ) {
    return filesCache.data;
  }
  try {
    const res = await fetch(`${BACKEND}/api/files`, {
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to fetch files");
    const files = json.data || [];
    filesCache = { data: files, timestamp: Date.now() };
    return files;
  } catch (err) {
    console.error("Error getAllFiles -> backend:", err);
    return [];
  }
}

/**
 * ✅ Get recent files with pagination
 */
export async function getRecentFiles(pageSize: number = 10) {
  try {
    const res = await fetch(`${BACKEND}/api/files?recent=1&limit=${pageSize}`, {
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to fetch recent files");
    return json.data || [];
  } catch (err) {
    console.error("Error getRecentFiles -> backend:", err);
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
export async function getFilteredFiles(constraints: unknown) {
  // Backend currently expects query parameters. For flexibility we call /api/files
  // and allow callers to filter client-side as a fallback.
  console.log("Filters:", constraints);
  return getAllFiles(true);
}

// Simple in-memory cache for search results
const searchCache = new Map<
  string,
  { data: (FileData & { id: string })[]; timestamp: number }
>();
// Cache TTL for search results (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * ✅ Search files by keyword (name, OCR text, tags) with caching
 */
export async function searchFiles(
  keyword: string,
  limit: number = 100,
  _forceFresh: boolean = false,
) {
  // Check cache first (unless forceFresh)
  const cached = searchCache.get(keyword);
  if (!_forceFresh && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({ q: keyword, limit: String(limit) });
    const res = await fetch(`${BACKEND}/api/search?${params.toString()}`, {
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Search failed");
    return json.data || [];
  } catch (err) {
    console.error("Error searchFiles -> backend:", err);
    return [];
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

  return results.map((file: FileData & { id: string }) => {
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
    } else if (
      tags.some((tag: string) => tag.toLowerCase().includes(searchTerm))
    ) {
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
    const res = await fetch(
      `${BACKEND}/api/files?department=${encodeURIComponent(department)}`,
      { headers: { ...authHeaders() } },
    );
    const json = await res.json();
    if (!res.ok)
      throw new Error(json?.error || "Failed to fetch department files");
    const files = json.data || [];
    console.log(`✅ Retrieved ${files.length} files from ${department}`);
    return files as (FileData & { id: string })[];
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
    const res = await fetch(`${BACKEND}/api/files/${id}`, {
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to fetch file");
    return json.data || null;
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
    const res = await fetch(`${BACKEND}/api/files/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        ...updates,
        modifiedAt: new Date(),
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to update file");
    clearFilesCache();
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update file";
    console.error("Error updating file:", error);
    throw new Error(`Failed to update file: ${errorMessage}`);
  }
}

// Delete file
export async function deleteFile(id: string, _storagePath?: string) {
  // _storagePath is kept for API compatibility but backend handles storage deletion
  try {
    const res = await fetch(`${BACKEND}/api/files/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to delete file");
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

  try {
    const formData = new FormData();
    formData.append("file", file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    options?.onProgress?.(0);

    const res = await fetch(`${BACKEND}/api/upload`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    options?.onProgress?.(100);

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Upload failed");

    // Backend returns { storageUrl, storageId }
    return {
      path: json.storageId,
      url: `${BACKEND}${json.storageUrl}`,
    };
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
    const res = await fetch(`${BACKEND}/api/tracking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        fileId: log.fileId,
        userId: log.user,
        userName: log.user,
        action:
          log.action === "checked_out"
            ? "taken"
            : log.action === "returned"
              ? "returned"
              : "moved",
        note: "",
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to add tracking log");
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
    const params = new URLSearchParams();
    if (fileId) params.set("fileId", fileId);
    params.set("limit", String(limit_rows));
    const res = await fetch(`${BACKEND}/api/tracking?${params.toString()}`, {
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok)
      throw new Error(json?.error || "Failed to fetch tracking logs");
    return (json.data || []) as (TrackingLog & { id: string })[];
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch tracking logs";
    console.error("Error fetching tracking logs:", error);
    throw new Error(`Failed to fetch tracking logs: ${errorMessage}`);
  }
}

export async function deleteFileTransaction(transactionId: string) {
  try {
    const res = await fetch(`${BACKEND}/api/tracking/${transactionId}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok)
      throw new Error(json?.error || "Failed to delete tracking record");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to delete tracking record";
    console.error("Error deleting tracking record:", error);
    throw new Error(`Failed to delete tracking record: ${errorMessage}`);
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
  const file = await getFile(input.fileId);

  if (!file) {
    throw new Error("File not found");
  }

  const currentLocation =
    (file.physicalLocation as string) || (file.location as string) || "Unknown";
  const fromLocation = input.fromLocation || currentLocation;
  const toLocation = input.toLocation || currentLocation;

  const res = await fetch(`${BACKEND}/api/tracking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({
      fileId: input.fileId,
      userId: input.userId,
      userName: input.userName || "",
      action: input.action,
      fromLocation,
      toLocation,
      note: input.note || "",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to create transaction");
  return json.data?.transactionId;
}

export async function getFileTransactions(options?: {
  fileId?: string;
  userId?: string;
  action?: FileTransactionAction;
  limitRows?: number;
}) {
  const params = new URLSearchParams();
  if (options?.fileId) params.set("fileId", options.fileId);
  if (options?.userId) params.set("userId", options.userId);
  if (options?.action) params.set("action", options.action);
  params.set("limit", String(options?.limitRows || 100));

  const res = await fetch(`${BACKEND}/api/tracking?${params.toString()}`, {
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to fetch transactions");
  return (json.data || []) as (FileTransaction & { id: string })[];
}

// ✅ STATISTICS & ANALYTICS

/**
 * Get daily statistics
 */
export async function getDailyStats(date?: string) {
  try {
    const params = new URLSearchParams();
    params.set("type", "daily");
    if (date) params.set("date", date);
    const res = await fetch(`${BACKEND}/api/stats?${params.toString()}`, {
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to fetch daily stats");
    return (
      json.data || {
        uploads: 0,
        departments: {},
        date: date || new Date().toISOString().split("T")[0],
      }
    );
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
    const res = await fetch(`${BACKEND}/api/stats?type=all-time`, {
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok)
      throw new Error(json?.error || "Failed to fetch all-time stats");
    return json.data || { totalUploads: 0, departmentBreakdown: {} };
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
    const res = await fetch(`${BACKEND}/api/settings/users/${userId}`, {
      headers: { ...authHeaders() },
    });
    // Some responses (404, empty body, or non-JSON) may cause res.json() to throw.
    // Safely read the body as text first and parse if possible.
    const text = await res.text();
    let json: any = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (e) {
        // ignore JSON parse errors and keep json as null
        json = null;
      }
    }

    if (!res.ok) {
      const errMsg =
        (json && json.error) || res.statusText || "Failed to fetch profile";
      console.warn("Failed to fetch user profile:", res.status, errMsg);
      return null;
    }

    return (json && json.data) || null;
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
    // Filter out undefined/null values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter((entry) => entry[1] != null),
    );
    const res = await fetch(`${BACKEND}/api/settings/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ ...cleanData, updatedAt: new Date() }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to save profile");
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save profile";
    throw new Error(`Failed to save profile: ${errorMessage}`);
  }
}

export async function uploadProfilePhoto(
  file: File,
  _userId: string,
): Promise<string> {
  // _userId is kept for API compatibility but backend identifies user from auth token
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${BACKEND}/api/upload`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Upload failed");
    // Return the storage URL
    return `${BACKEND}${json.storageUrl}`;
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to upload photo";
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

    onProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    fetch(`${BACKEND}/api/upload`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
    })
      .then(async (res) => {
        onProgress(100);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Upload failed");
        resolve(`${BACKEND}${json.storageUrl}`);
      })
      .catch((error: unknown) => {
        const typedError = error as { message?: string };
        const msg = typedError?.message || "Upload failed";
        reject(new Error(`Upload failed: ${msg}`));
      });
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

// Default settings constants removed - backend handles seeding

// Locations
export async function getSettingsLocations() {
  const res = await fetch(`${BACKEND}/api/settings/locations`, {
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to fetch locations");
  return (json.data || []) as (StorageLocationSetting & { id: string })[];
}

export async function addSettingsLocation(
  payload: Omit<StorageLocationSetting, "id" | "createdAt" | "updatedAt">,
) {
  const name = normalizeString(payload.name || "");
  const type = normalizeString(payload.type || "");

  if (!name || !type) {
    throw new Error("Location name and type are required");
  }

  const res = await fetch(`${BACKEND}/api/settings/locations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ name, type }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to add location");
  return json.data?.id;
}

export async function updateSettingsLocation(
  id: string,
  payload: Partial<StorageLocationSetting>,
) {
  const res = await fetch(`${BACKEND}/api/settings/locations/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to update location");
}

export async function deleteSettingsLocation(id: string) {
  const res = await fetch(`${BACKEND}/api/settings/locations/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to delete location");
}

// Departments
export async function getSettingsDepartments() {
  const res = await fetch(`${BACKEND}/api/settings/departments`, {
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to fetch departments");
  return (json.data || []) as (DepartmentSetting & { id: string })[];
}

export async function addSettingsDepartment(
  payload: Omit<DepartmentSetting, "id" | "createdAt" | "updatedAt">,
) {
  const name = normalizeString(payload.name || "");
  if (!name) {
    throw new Error("Department name is required");
  }

  const res = await fetch(`${BACKEND}/api/settings/departments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ name, filesCount: payload.filesCount || 0 }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to add department");
  return json.data?.id;
}

export async function updateSettingsDepartment(
  id: string,
  payload: Partial<DepartmentSetting>,
) {
  const res = await fetch(`${BACKEND}/api/settings/departments/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to update department");
}

export async function deleteSettingsDepartment(id: string) {
  const res = await fetch(`${BACKEND}/api/settings/departments/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to delete department");
}

// Users in settings management
export async function getSettingsUsers() {
  const res = await fetch(`${BACKEND}/api/settings/users`, {
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to fetch users");
  return (json.data || []) as (SettingsUser & { id: string })[];
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

  const res = await fetch(`${BACKEND}/api/settings/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ name, email, role }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to add user");
  return json.data?.id;
}

export async function updateSettingsUser(
  id: string,
  payload: Partial<SettingsUser>,
) {
  const res = await fetch(`${BACKEND}/api/settings/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to update user");
}

export async function deleteSettingsUser(id: string) {
  const res = await fetch(`${BACKEND}/api/settings/users/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to delete user");
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
  // Get users from the main users collection via the backend
  const res = await fetch(`${BACKEND}/api/settings/users`, {
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Failed to fetch users");
  return (json.data || []) as AccountSettingsUser[];
}

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  fileExpirationDays: 365,
  notifyOnFileExpiration: true,
  notifyOnFileCheckout: true,
  dailySummaryEmail: false,
  maxUploadSizeMb: 50,
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const res = await fetch(`${BACKEND}/api/settings/system`, {
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) {
    console.warn("Failed to fetch system settings, using defaults");
    return DEFAULT_SYSTEM_SETTINGS;
  }
  const data = json.data || {};
  return {
    fileExpirationDays: Number(data.fileExpirationDays ?? 365),
    notifyOnFileExpiration: Boolean(data.notifyOnFileExpiration ?? true),
    notifyOnFileCheckout: Boolean(data.notifyOnFileCheckout ?? true),
    dailySummaryEmail: Boolean(data.dailySummaryEmail ?? false),
    maxUploadSizeMb: Number(data.maxUploadSizeMb ?? 50),
  };
}

export async function updateSystemSettings(payload: Partial<SystemSettings>) {
  const res = await fetch(`${BACKEND}/api/settings/system`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(json?.error || "Failed to update system settings");
}
