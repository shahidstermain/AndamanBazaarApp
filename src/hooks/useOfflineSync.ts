import { useState, useEffect, useCallback, useRef } from 'react';
import {
  QueueItem,
  QueueEntityType,
  QueueStatus,
  SyncHandler,
  isNetworkOnline,
  subscribeToNetworkChanges,
  processSyncQueue,
  getPendingItems,
  getQueueStats,
  cleanupSyncedItems,
  resetFailedItems,
  saveDraftIndexedDB,
  loadDraftIndexedDB,
  clearDraftIndexedDB,
  cleanupNetworkListeners,
} from '../lib/offlineQueue';
import { auth } from '../lib/firebase';

export interface UseOfflineSyncReturn {
  // Network status
  isOnline: boolean;

  // Queue status
  pendingCount: number;
  syncingCount: number;
  failedCount: number;

  // Actions
  syncNow: () => Promise<void>;
  isSyncing: boolean;
  lastSyncResult: {
    processed: number;
    succeeded: number;
    failed: number;
    errors: string[];
  } | null;

  // Queue management
  retryFailed: () => Promise<void>;
  clearCompleted: () => Promise<number>;

  // Drafts
  saveDraft: (draft: Parameters<typeof saveDraftIndexedDB>[1]) => Promise<void>;
  loadDraft: () => Promise<import('../lib/offlineQueue').DraftListingData | null>;
  clearDraft: () => Promise<void>;
}

export function useOfflineSync(
  userId: string | null,
  handlers: Record<QueueEntityType, SyncHandler>
): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(isNetworkOnline());
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncingCount, setSyncingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState<UseOfflineSyncReturn['lastSyncResult']>(null);

  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Subscribe to network changes
  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges((online) => {
      setIsOnline(online);
      // Auto-sync when coming back online
      if (online && userId) {
        syncNow();
      }
    });
    
    // Cleanup network listeners when component unmounts
    return () => {
      unsubscribe();
      // Note: We don't call cleanupNetworkListeners() here as other components might be using it
    };
  }, [userId]);

  // Update queue stats periodically
  useEffect(() => {
    if (!userId) return;

    const updateStats = async () => {
      const stats = await getQueueStats(userId);
      setPendingCount(stats.pending);
      setSyncingCount(stats.syncing);
      setFailedCount(stats.failed);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, [userId]);

  // Sync now action
  const syncNow = useCallback(async () => {
    if (!userId || !isNetworkOnline()) return;

    setIsSyncing(true);
    try {
      const result = await processSyncQueue(userId, handlersRef.current);
      setLastSyncResult(result);

      // Update stats
      const stats = await getQueueStats(userId);
      setPendingCount(stats.pending);
      setSyncingCount(stats.syncing);
      setFailedCount(stats.failed);
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  // Retry failed items
  const retryFailed = useCallback(async () => {
    if (!userId || !isNetworkOnline()) return;

    setIsSyncing(true);
    try {
      // Reset all failed items back to pending so processSyncQueue picks them up
      await resetFailedItems(userId);

      // Trigger sync
      await syncNow();
    } finally {
      setIsSyncing(false);
    }
  }, [userId, syncNow]);

  // Clear completed items
  const clearCompleted = useCallback(async () => {
    return await cleanupSyncedItems();
  }, []);

  // Draft operations
  const saveDraft = useCallback(
    async (draft: Parameters<typeof saveDraftIndexedDB>[1]) => {
      if (!userId) return;
      await saveDraftIndexedDB(userId, draft);
    },
    [userId]
  );

  const loadDraft = useCallback(async () => {
    if (!userId) return null;
    return loadDraftIndexedDB(userId);
  }, [userId]);

  const clearDraft = useCallback(async () => {
    if (!userId) return;
    await clearDraftIndexedDB(userId);
  }, [userId]);

  return {
    isOnline,
    pendingCount,
    syncingCount,
    failedCount,
    syncNow,
    isSyncing,
    lastSyncResult,
    retryFailed,
    clearCompleted,
    saveDraft,
    loadDraft,
    clearDraft,
  };
}

// ===== LISTING SYNC HANDLER =====

const getSyncFunctionUrl = (): string => {
  const functionUrl = import.meta.env.VITE_FIREBASE_SECURE_SYNC_FUNCTION;
  if (!functionUrl) throw new Error('Secure sync function URL not configured');
  return functionUrl;
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export function createListingSyncHandler(): SyncHandler {
  return async (item) => {
    try {
      const response = await fetch(getSyncFunctionUrl(), {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          entityType: 'listing',
          operation: 'create',
          payload: item.payload,
          clientTimestamp: item.clientTimestamp,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Sync failed' };
      }

      return { success: result.success, serverId: result.serverId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

// ===== MESSAGE SYNC HANDLER =====

export function createMessageSyncHandler(): SyncHandler {
  return async (item) => {
    try {
      const response = await fetch(getSyncFunctionUrl(), {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          entityType: 'message',
          operation: 'create',
          payload: item.payload,
          clientTimestamp: item.clientTimestamp,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Sync failed' };
      }

      return { success: result.success, serverId: result.serverId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

// ===== PROFILE UPDATE SYNC HANDLER =====

export function createProfileSyncHandler(): SyncHandler {
  return async (item) => {
    try {
      const response = await fetch(getSyncFunctionUrl(), {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          entityType: 'profile_update',
          operation: 'update',
          payload: item.payload,
          clientTimestamp: item.clientTimestamp,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Sync failed' };
      }

      return { success: result.success, serverId: result.serverId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

// ===== USE SYNC QUEUE ITEMS HOOK =====

export function useSyncQueueItems(userId: string | null) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const loadItems = async () => {
      setLoading(true);
      const pending = await getPendingItems(userId);
      setItems(pending);
      setLoading(false);
    };

    loadItems();

    // Refresh every 5 seconds
    const interval = setInterval(loadItems, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  return { items, loading, refresh: () => getPendingItems(userId || '').then(setItems) };
}
