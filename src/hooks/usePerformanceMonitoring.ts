import { useState, useEffect, useCallback } from 'react';
import { 
  measurePerformance, 
  getMemoryUsage, 
  checkPerformanceBudget, 
  reportPerformanceMetrics,
  PerformanceMetrics,
  debounce
} from '@/lib/performance';

export interface PerformanceMonitoringState {
  metrics: PerformanceMetrics | null;
  memory: ReturnType<typeof getMemoryUsage> | null;
  budgetViolations: string[];
  isMonitoring: boolean;
  lastUpdated: Date | null;
}

export function usePerformanceMonitoring(enabled: boolean = true) {
  const [state, setState] = useState<PerformanceMonitoringState>({
    metrics: null,
    memory: null,
    budgetViolations: [],
    isMonitoring: false,
    lastUpdated: null,
  });

  const startMonitoring = useCallback(async () => {
    if (!enabled || state.isMonitoring) return;

    setState(prev => ({ ...prev, isMonitoring: true }));

    try {
      // Measure performance metrics
      const metrics = await measurePerformance();
      const memory = getMemoryUsage();
      const budgetCheck = await checkPerformanceBudget();

      setState({
        metrics,
        memory,
        budgetViolations: budgetCheck.violations,
        isMonitoring: false,
        lastUpdated: new Date(),
      });

      // Report metrics to analytics
      await reportPerformanceMetrics();
    } catch (error) {
      console.error('Performance monitoring failed:', error);
      setState(prev => ({ ...prev, isMonitoring: false }));
    }
  }, [enabled, state.isMonitoring]);

  // Auto-monitor on page load
  useEffect(() => {
    if (enabled) {
      // Wait for page to fully load
      const timer = setTimeout(() => {
        startMonitoring();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [enabled, startMonitoring]);

  // Monitor on route changes (if applicable)
  useEffect(() => {
    const handleRouteChange = () => {
      if (enabled) {
        setTimeout(startMonitoring, 1000);
      }
    };

    // Listen for navigation events
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [enabled, startMonitoring]);

  return {
    ...state,
    startMonitoring,
    refresh: startMonitoring,
  };
}

export function usePerformanceBudget() {
  const [violations, setViolations] = useState<string[]>([]);
  const [passed, setPassed] = useState(true);

  const checkBudget = useCallback(async () => {
    try {
      const result = await checkPerformanceBudget();
      setViolations(result.violations);
      setPassed(result.passed);
    } catch (error) {
      console.error('Budget check failed:', error);
    }
  }, []);

  useEffect(() => {
    checkBudget();
    
    // Re-check on window resize (affects image loading)
    const handleResize = debounce(checkBudget, 1000);
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [checkBudget]);

  return {
    violations,
    passed,
    checkBudget,
  };
}

// Hook for monitoring specific component performance
export function useComponentPerformance(componentName: string) {
  const [renderTime, setRenderTime] = useState<number>(0);
  const [renderCount, setRenderCount] = useState(0);

  const startRender = useCallback(() => {
    return performance.now();
  }, []);

  const endRender = useCallback((startTime: number) => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    setRenderTime(duration);
    setRenderCount(prev => prev + 1);

    // Log slow renders
    if (duration > 100) {
      console.warn(`Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`);
    }
  }, [componentName]);

  return {
    renderTime,
    renderCount,
    startRender,
    endRender,
  };
}
