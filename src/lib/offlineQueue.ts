import { openDB, DBSchema, IDBPDatabase } from "idb";

// ===== TYPES =====

export type QueueEntityType = "listing" | "message" | "profile_update";
export type QueueOperation = "create" | "update" | "delete";
export type QueueStatus = "pending" | "syncing" | "synced" | "failed";

export interface QueueItem {
  id?: string; // Client-side ID, will be replaced with server ID after sync
  userId: string;
  entityType: QueueEntityType;
  operation: QueueOperation;
  payload: unknown;
  clientTimestamp: Date;
  status: QueueStatus;
  errorMessage?: string;
  retryCount: number;
  syncedAt?: Date;
  lastFailedAt?: Date; // Track when it last failed
}

export interface DraftListingData {
  id?: string; // IndexedDB keyPath
  step: number;
  title: string;
  description: string;
  price: string;
  condition: string;
  category?: string;
  subcategory?: string;
  city: string;
  area: string;
  imagePreviews: string[];
  isNegotiable: boolean;
  minPrice?: string;
  itemAge?: string;
  hasWarranty: boolean;
  warrantyExpiry?: string;
  hasInvoice: boolean;
  accessories: string[];
  contactPreferences: { chat: boolean; phone?: boolean; whatsapp?: boolean };
  idempotencyKey: string;
  updatedAt: number;
}

// ===== DATABASE SCHEMA =====

interface AndamanDBSchema extends DBSchema {
  syncQueue: {
    key: string;
    value: QueueItem;
    indexes: {
      "by-status": QueueStatus;
      "by-user": string;
    };
  };
  drafts: {
    key: string;
    value: DraftListingData;
  };
  cachedListings: {
    key: string;
    value: unknown;
  };
}

// ===== CONSTANTS =====

const DB_NAME = "andaman-bazaar-v1";
const DB_VERSION = 1;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS = [1000, 5000, 15000, 30000, 60000]; // Exponential backoff

// ===== DATABASE INITIALIZATION =====

let dbPromise: Promise<IDBPDatabase<AndamanDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<AndamanDBSchema>> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<AndamanDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      if (oldVersion < 1) {
        // Create sync queue store
        const queueStore = db.createObjectStore("syncQueue", { keyPath: "id" });
        queueStore.createIndex("by-status", "status");
        queueStore.createIndex("by-user", "userId");

        // Create drafts store
        db.createObjectStore("drafts", { keyPath: "id" });

        // Create cached listings store
        db.createObjectStore("cachedListings", { keyPath: "id" });
      }
    },
  });

  return dbPromise;
}

// ===== SYNC QUEUE OPERATIONS =====

/**
 * Add an item to the sync queue
 */
export async function addToQueue(
  userId: string,
  entityType: QueueEntityType,
  operation: QueueOperation,
  payload: unknown,
): Promise<string> {
  const db = await getDB();
  const id = `${entityType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const item: QueueItem = {
    id,
    userId,
    entityType,
    operation,
    payload,
    clientTimestamp: new Date(),
    status: "pending",
    retryCount: 0,
  };

  await db.put("syncQueue", item);
  return id;
}

/**
 * Get all pending items for a user
 */
export async function getPendingItems(userId: string): Promise<QueueItem[]> {
  const db = await getDB();
  const allItems = await db.getAllFromIndex("syncQueue", "by-user", userId);
  return allItems.filter(
    (item) => item.status === "pending" || item.status === "failed",
  );
}

/**
 * Get all queue items for a user
 */
export async function getAllQueueItems(userId: string): Promise<QueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("syncQueue", "by-user", userId);
}

/**
 * Update queue item status
 */
export async function updateQueueItemStatus(
  id: string,
  status: QueueStatus,
  errorMessage?: string,
): Promise<void> {
  const db = await getDB();
  const item = await db.get("syncQueue", id);

  if (item) {
    item.status = status;
    if (errorMessage) item.errorMessage = errorMessage;
    if (status === "synced") {
      item.syncedAt = new Date();
    } else if (status === "failed") {
      item.retryCount++;
    }
    await db.put("syncQueue", item);
  }
}

/**
 * Mark item as syncing (in progress)
 */
export async function markItemSyncing(id: string): Promise<void> {
  await updateQueueItemStatus(id, "syncing");
}

/**
 * Mark item as synced successfully
 */
export async function markItemSynced(id: string): Promise<void> {
  await updateQueueItemStatus(id, "synced");
}

/**
 * Mark item as failed with error
 */
export async function markItemFailed(id: string, error: string): Promise<void> {
  const db = await getDB();
  const item = await db.get("syncQueue", id);

  if (item) {
    item.status = "failed";
    item.errorMessage = error;
    item.retryCount++;
    item.lastFailedAt = new Date(); // Track actual failure time
    await db.put("syncQueue", item);
  }
}

/**
 * Remove an item from the queue
 */
export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("syncQueue", id);
}

/**
 * Get retry delay for an item based on retry count
 */
export function getRetryDelay(retryCount: number): number {
  if (retryCount >= MAX_RETRY_ATTEMPTS) return -1; // No more retries
  return RETRY_DELAYS[retryCount] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
}

/**
 * Check if an item should be retried
 */
export function shouldRetry(item: QueueItem): boolean {
  return item.retryCount < MAX_RETRY_ATTEMPTS;
}

/**
 * Reset all failed items for a user back to pending (for manual retry)
 */
export async function resetFailedItems(userId: string): Promise<number> {
  const db = await getDB();
  const items = await db.getAllFromIndex("syncQueue", "by-user", userId);
  const failedItems = items.filter(
    (i) => i.status === "failed" && i.retryCount < MAX_RETRY_ATTEMPTS,
  );

  for (const item of failedItems) {
    item.status = "pending";
    item.errorMessage = undefined;
    await db.put("syncQueue", item);
  }

  return failedItems.length;
}

/**
 * Clear all synced items older than 7 days
 */
export async function cleanupSyncedItems(): Promise<number> {
  const db = await getDB();
  const allItems = await db.getAll("syncQueue");
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let deletedCount = 0;
  for (const item of allItems) {
    if (
      item.status === "synced" &&
      item.syncedAt &&
      new Date(item.syncedAt) < cutoffDate
    ) {
      await db.delete("syncQueue", item.id!);
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Get queue statistics for a user
 */
export async function getQueueStats(userId: string): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  total: number;
}> {
  const db = await getDB();
  const items = await db.getAllFromIndex("syncQueue", "by-user", userId);

  return {
    pending: items.filter((i) => i.status === "pending").length,
    syncing: items.filter((i) => i.status === "syncing").length,
    synced: items.filter((i) => i.status === "synced").length,
    failed: items.filter((i) => i.status === "failed").length,
    total: items.length,
  };
}

// ===== DRAFT OPERATIONS =====

const DRAFT_KEY_PREFIX = "draft_listing_";

/**
 * Get the draft key for a user
 */
function getDraftKey(userId: string): string {
  return `${DRAFT_KEY_PREFIX}${userId}`;
}

/**
 * Save draft to IndexedDB
 */
export async function saveDraftIndexedDB(
  userId: string,
  draft: DraftListingData,
): Promise<void> {
  const db = await getDB();
  await db.put("drafts", { ...draft, id: getDraftKey(userId) });
}

/**
 * Load draft from IndexedDB
 */
export async function loadDraftIndexedDB(
  userId: string,
): Promise<DraftListingData | null> {
  const db = await getDB();
  const key = getDraftKey(userId);
  const draft = await db.get("drafts", key);

  if (!draft) return null;

  // Check 72-hour TTL
  const DRAFT_TTL_MS = 72 * 60 * 60 * 1000;
  if (Date.now() - draft.updatedAt > DRAFT_TTL_MS) {
    await clearDraftIndexedDB(userId);
    return null;
  }

  return draft;
}

/**
 * Clear draft from IndexedDB
 */
export async function clearDraftIndexedDB(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete("drafts", getDraftKey(userId));
}

/**
 * Check if draft exists in IndexedDB
 */
export async function hasDraftIndexedDB(userId: string): Promise<boolean> {
  const draft = await loadDraftIndexedDB(userId);
  return draft !== null;
}

// ===== SYNC PROCESSOR =====

export type SyncHandler = (
  item: QueueItem,
) => Promise<{ success: boolean; serverId?: string; error?: string }>;

/**
 * Process the sync queue
 * Call this when coming back online
 */
export async function processSyncQueue(
  userId: string,
  handlers: Record<QueueEntityType, SyncHandler>,
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const pendingItems = await getPendingItems(userId);
  const result = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const item of pendingItems) {
    // Skip items that need to wait before retry
    if (item.status === "failed") {
      const retryDelay = getRetryDelay(item.retryCount);
      if (retryDelay === -1) continue; // Max retries reached

      // Use actual failure time instead of client timestamp
      const failureTime =
        item.lastFailedAt?.getTime() ||
        item.clientTimestamp?.getTime() ||
        Date.now();
      const timeSinceFailure = Date.now() - failureTime;
      if (timeSinceFailure < retryDelay) continue;
    }

    result.processed++;
    await markItemSyncing(item.id!);

    try {
      const handler = handlers[item.entityType];
      if (!handler) {
        throw new Error(`No handler for entity type: ${item.entityType}`);
      }

      const response = await handler(item);

      if (response.success) {
        await markItemSynced(item.id!);
        result.succeeded++;
      } else {
        await markItemFailed(item.id!, response.error || "Unknown error");
        result.failed++;
        result.errors.push(response.error || "Unknown error");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await markItemFailed(item.id!, errorMessage);
      result.failed++;
      result.errors.push(errorMessage);
    }
  }

  return result;
}

// ===== NETWORK STATUS =====

let isOnline = navigator.onLine;
const listeners = new Set<(online: boolean) => void>();

function updateNetworkStatus() {
  isOnline = navigator.onLine;
  listeners.forEach((listener) => listener(isOnline));
}

// Store event listener references for cleanup
const onlineEventListener = () => updateNetworkStatus();
const offlineEventListener = () => updateNetworkStatus();

window.addEventListener("online", onlineEventListener);
window.addEventListener("offline", offlineEventListener);

// Cleanup function for SPA environments
export function cleanupNetworkListeners() {
  window.removeEventListener("online", onlineEventListener);
  window.removeEventListener("offline", offlineEventListener);
  listeners.clear();
}

export function isNetworkOnline(): boolean {
  return isOnline;
}

export function subscribeToNetworkChanges(
  callback: (online: boolean) => void,
): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
