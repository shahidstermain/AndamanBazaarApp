import React from "react";
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";
import {
  useOfflineSync,
  createListingSyncHandler,
  createMessageSyncHandler,
  createProfileSyncHandler,
} from "../hooks/useOfflineSync";

interface OfflineSyncBannerProps {
  userId: string | null;
  className?: string;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  userId,
  className,
}) => {
  const handlers = {
    listing: createListingSyncHandler(),
    message: createMessageSyncHandler(),
    profile_update: createProfileSyncHandler(),
  };

  const {
    isOnline,
    pendingCount,
    failedCount,
    isSyncing,
    syncNow,
    lastSyncResult,
    retryFailed,
  } = useOfflineSync(userId, handlers);

  // Don't show if online and nothing to sync
  if (isOnline && pendingCount === 0 && failedCount === 0) {
    // Show brief success message if there was a recent successful sync
    if (
      lastSyncResult &&
      lastSyncResult.processed > 0 &&
      lastSyncResult.failed === 0
    ) {
      return (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 bg-green-600 text-white py-3 px-4",
            "flex items-center justify-center gap-2 animate-in slide-in-from-bottom-full",
            className,
          )}
        >
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {lastSyncResult.succeeded} item
            {lastSyncResult.succeeded > 1 ? "s" : ""} synced successfully
          </span>
        </div>
      );
    }
    return null;
  }

  // Offline state
  if (!isOnline) {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white py-3 px-4",
          "flex items-center justify-between gap-2",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium">
            You are offline.{" "}
            {pendingCount > 0 && `${pendingCount} items waiting to sync.`}
          </span>
        </div>
        <span className="text-xs text-slate-400">Changes saved locally</span>
      </div>
    );
  }

  // Syncing state
  if (isSyncing) {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-blue-600 text-white py-3 px-4",
          "flex items-center justify-center gap-2",
          className,
        )}
      >
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">
          Syncing {pendingCount} items...
        </span>
      </div>
    );
  }

  // Failed items state
  if (failedCount > 0) {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-red-600 text-white py-3 px-4",
          "flex items-center justify-between gap-2",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {failedCount} item{failedCount > 1 ? "s" : ""} failed to sync
          </span>
        </div>
        <button
          onClick={retryFailed}
          className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Pending items state (online, waiting to sync)
  if (pendingCount > 0) {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-teal-600 text-white py-3 px-4",
          "flex items-center justify-between gap-2",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {pendingCount} item{pendingCount > 1 ? "s" : ""} ready to sync
          </span>
        </div>
        <button
          onClick={syncNow}
          className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Sync Now
        </button>
      </div>
    );
  }

  return null;
};
