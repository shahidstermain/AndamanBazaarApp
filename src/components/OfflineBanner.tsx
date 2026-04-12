import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white py-3 px-4 flex items-center justify-center gap-2 animate-in slide-in-from-bottom-full duration-300 shadow-lg",
      )}
    >
      <WifiOff className="w-4 h-4 text-red-400" />
      <span className="text-sm font-medium">
        You are currently offline. Some features may be unavailable.
      </span>
    </div>
  );
};
