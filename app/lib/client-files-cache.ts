type FilesApiResponse<T> = {
  success?: boolean;
  data?: T[];
};

const FILES_CACHE_TTL_MS = 30_000;

let cachedFiles: unknown[] | null = null;
let cacheTimestamp = 0;
let inFlightRequest: Promise<unknown[]> | null = null;

function hasValidCache() {
  return (
    Array.isArray(cachedFiles) &&
    Date.now() - cacheTimestamp < FILES_CACHE_TTL_MS
  );
}

export function getFilesCacheSnapshot<T>(): T[] | null {
  return hasValidCache() ? ((cachedFiles as T[]) ?? null) : null;
}

export function clearFilesClientCache() {
  cachedFiles = null;
  cacheTimestamp = 0;
  inFlightRequest = null;
}

export async function fetchFilesClient<T>(options?: {
  forceRefresh?: boolean;
}): Promise<T[]> {
  const forceRefresh = Boolean(options?.forceRefresh);

  if (!forceRefresh && hasValidCache()) {
    return cachedFiles as T[];
  }

  if (!forceRefresh && inFlightRequest) {
    return inFlightRequest as Promise<T[]>;
  }

  inFlightRequest = fetch("/api/files", { cache: "no-store" })
    .then(async (response) => {
      const json = (await response.json()) as FilesApiResponse<T>;
      if (!response.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error("Failed to load files");
      }
      cachedFiles = json.data;
      cacheTimestamp = Date.now();
      return json.data;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest as Promise<T[]>;
}
