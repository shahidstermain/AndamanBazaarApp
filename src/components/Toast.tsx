import React, { useState, useEffect, useCallback, useRef } from "react";
import { safeRandomUUID } from "../lib/random";
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => React.useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration: number = 3500) => {
      const id = safeRandomUUID();
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 w-full max-w-md px-4 pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const toastStyles = {
  success: "bg-emerald-600 text-white",
  error: "bg-coral-600 text-white",
  warning: "bg-amber-500 text-black",
  info: "bg-slate-800 text-white",
};

const toastIcons = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const ToastItem: React.FC<{
  toast: Toast;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 3500);

    return () => clearTimeout(timerRef.current);
  }, [toast, onDismiss]);

  const handleDismiss = () => {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl font-bold text-sm transition-all duration-300 ${toastStyles[toast.type]} ${
        exiting
          ? "opacity-0 translate-y-4 scale-95"
          : "opacity-100 translate-y-0 scale-100 animate-slide-up"
      }`}
    >
      <span className="flex-shrink-0">{toastIcons[toast.type]}</span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Close"
        title="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
};
