import React, { useState, useEffect } from "react";
import {
  usePerformanceMonitoring,
  usePerformanceBudget,
} from "@/hooks/usePerformanceMonitoring";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceMonitorProps {
  enabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === "development",
  showDetails = false,
  className = "",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const performance = usePerformanceMonitoring(enabled);
  const budget = usePerformanceBudget();

  // Toggle visibility with keyboard shortcut (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (!enabled || !isVisible) return null;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatMemory = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)}KB`;
    return `${mb.toFixed(1)}MB`;
  };

  const getScoreColor = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value > threshold : value < threshold;
    return isGood
      ? "text-green-600"
      : value < threshold * 1.5
        ? "text-yellow-600"
        : "text-red-600";
  };

  const getScoreIcon = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value > threshold : value < threshold;
    return isGood ? CheckCircle : value < threshold * 1.5 ? AlertCircle : Clock;
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-50",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-600" />
          <h3 className="font-semibold text-sm">Performance Monitor</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      {/* Core Web Vitals */}
      {performance.metrics && (
        <div className="space-y-2 mb-3">
          <h4 className="text-xs font-medium text-gray-700">Core Web Vitals</h4>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              LCP
            </span>
            <span className={getScoreColor(performance.metrics.lcp, 2500)}>
              {formatTime(performance.metrics.lcp)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              FID
            </span>
            <span className={getScoreColor(performance.metrics.fid || 0, 100)}>
              {formatTime(performance.metrics.fid || 0)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              CLS
            </span>
            <span className={getScoreColor(performance.metrics.cls || 0, 0.1)}>
              {(performance.metrics.cls || 0).toFixed(3)}
            </span>
          </div>
        </div>
      )}

      {/* Memory Usage */}
      {performance.memory && (
        <div className="space-y-2 mb-3">
          <h4 className="text-xs font-medium text-gray-700">Memory Usage</h4>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              Used
            </span>
            <span
              className={getScoreColor(performance.memory.usedJSHeapSize, 50)}
            >
              {formatMemory(performance.memory.usedJSHeapSize)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span>Total</span>
            <span className="text-gray-600">
              {formatMemory(performance.memory.totalJSHeapSize)}
            </span>
          </div>
        </div>
      )}

      {/* Performance Budget */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-gray-700">Budget Status</h4>
          <span
            className={cn(
              "text-xs px-2 py-1 rounded",
              budget.passed
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700",
            )}
          >
            {budget.passed ? "Passed" : "Violations"}
          </span>
        </div>

        {!budget.passed && budget.violations.length > 0 && (
          <div className="text-xs text-red-600 space-y-1">
            {budget.violations.slice(0, 3).map((violation, index) => (
              <div key={index} className="truncate">
                • {violation}
              </div>
            ))}
            {budget.violations.length > 3 && (
              <div>+{budget.violations.length - 3} more</div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={performance.refresh}
          className="text-xs px-3 py-1 bg-teal-50 text-teal-700 rounded hover:bg-teal-100 transition-colors"
        >
          Refresh
        </button>
        {showDetails && (
          <button
            onClick={() =>
              console.log("Performance Details:", performance, budget)
            }
            className="text-xs px-3 py-1 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors"
          >
            Details
          </button>
        )}
      </div>

      {/* Last Updated */}
      {performance.lastUpdated && (
        <div className="text-xs text-gray-400 mt-2">
          Last updated: {performance.lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

// Performance score component
export const PerformanceScore: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const performance = usePerformanceMonitoring(false);
  const budget = usePerformanceBudget();

  if (!performance.metrics) return null;

  // Calculate overall performance score
  const lcpScore =
    performance.metrics.lcp < 2500
      ? 100
      : Math.max(0, 100 - (performance.metrics.lcp - 2500) / 50);
  const fidScore =
    (performance.metrics.fid || 0) < 100
      ? 100
      : Math.max(0, 100 - (performance.metrics.fid || 0) / 10);
  const clsScore =
    (performance.metrics.cls || 0) < 0.1
      ? 100
      : Math.max(0, 100 - (performance.metrics.cls || 0) * 1000);
  const budgetScore = budget.passed ? 100 : 50;

  const overallScore = Math.round(
    (lcpScore + fidScore + clsScore + budgetScore) / 4,
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return CheckCircle;
    if (score >= 70) return AlertCircle;
    return Clock;
  };

  const Icon = getScoreIcon(overallScore);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className={cn("w-4 h-4", getScoreColor(overallScore))} />
      <span className={cn("text-sm font-medium", getScoreColor(overallScore))}>
        {overallScore}
      </span>
    </div>
  );
};
