import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LazyRouteProps {
  componentPath: string;
  fallback?: React.ReactNode;
  className?: string;
}

// Loading component with skeleton
const LoadingFallback: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn('animate-pulse space-y-4', className)}>
    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-32 bg-gray-200 rounded"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Loading spinner for smaller components
const SpinnerFallback: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={cn('flex items-center justify-center p-8', className)}>
    <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
  </div>
);

// Create lazy loaded component with error boundary
const createLazyComponent = (componentPath: string) => {
  return lazy(() => {
    // Vite requires the file extension in the static part of the dynamic import.
    return import(`@/pages/${componentPath}.tsx`).catch(error => {
      console.error(`Failed to load component: ${componentPath}`, error);
      // Return a fallback component
      return {
        default: () => (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Component Not Found</h2>
              <p className="text-gray-600">Unable to load {componentPath}</p>
            </div>
          </div>
        )
      };
    });
  });
};

// Lazy route component with different loading strategies
export const LazyRoute: React.FC<LazyRouteProps> = ({
  componentPath,
  fallback = <LoadingFallback />,
  className = '',
}) => {
  const LazyComponent = createLazyComponent(componentPath);

  return (
    <div className={className}>
      <Suspense fallback={fallback}>
        <LazyComponent />
      </Suspense>
    </div>
  );
};

// Preload component for better UX
export const PreloadLazyRoute: React.FC<LazyRouteProps> = ({
  componentPath,
  fallback = <SpinnerFallback />,
  className = '',
}) => {
  const LazyComponent = createLazyComponent(componentPath);

  // Preload the component when it's likely to be needed
  React.useEffect(() => {
    const timer = setTimeout(() => {
      import(`@/pages/${componentPath}.tsx`).catch(() => {
        // Silently ignore preload errors
      });
    }, 2000); // Preload after 2 seconds

    return () => clearTimeout(timer);
  }, [componentPath]);

  return (
    <div className={className}>
      <Suspense fallback={fallback}>
        <LazyComponent />
      </Suspense>
    </div>
  );
};

// Intersection Observer based lazy loading for routes
export const IntersectionLazyRoute: React.FC<LazyRouteProps & {
  rootMargin?: string;
  threshold?: number;
}> = ({
  componentPath,
  fallback = <LoadingFallback />,
  className = '',
  rootMargin = '200px',
  threshold = 0.1,
}) => {
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const LazyComponent = React.useMemo(() => createLazyComponent(componentPath), [componentPath]);

  React.useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    const element = document.getElementById(`lazy-route-${componentPath}`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [componentPath, rootMargin, threshold]);

  return (
    <div id={`lazy-route-${componentPath}`} className={className}>
      {shouldLoad ? (
        <Suspense fallback={fallback}>
          <LazyComponent />
        </Suspense>
      ) : (
        <LoadingFallback />
      )}
    </div>
  );
};

// HOC for lazy loading with performance monitoring
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: React.ReactNode;
    preload?: boolean;
    rootMargin?: string;
  } = {}
) => {
  const LazyWrappedComponent = React.lazy(() => {
    return Promise.resolve({ default: Component });
  });

  const WrappedComponent = (props: P) => {
    // Preload if requested
    React.useEffect(() => {
      if (options.preload) {
        const timer = setTimeout(() => {
          // Note: Components are already loaded, no need for dynamic import
          // This is a placeholder for future preloading strategies
        }, 1000);

        return () => clearTimeout(timer);
      }
    }, []);

    return (
      <Suspense fallback={options.fallback || <SpinnerFallback />}>
        <LazyWrappedComponent {...(props as any)} />
      </Suspense>
    );
  };

  WrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Specific lazy loaded components for common use cases
export const LazyHome = () => <LazyRoute componentPath="Home" fallback={<LoadingFallback />} />;
export const LazyListings = () => <LazyRoute componentPath="Listings" fallback={<LoadingFallback />} />;
export const LazyListingDetail = () => <LazyRoute componentPath="ListingDetail" fallback={<LoadingFallback />} />;
export const LazyCreateListing = () => <LazyRoute componentPath="CreateListing" fallback={<LoadingFallback />} />;
export const LazyProfile = () => <LazyRoute componentPath="Profile" fallback={<LoadingFallback />} />;
export const LazyChatList = () => <LazyRoute componentPath="ChatList" fallback={<LoadingFallback />} />;
export const LazyChatRoom = () => <LazyRoute componentPath="ChatRoom" fallback={<LoadingFallback />} />;
export const LazyAdmin = () => <LazyRoute componentPath="Admin" fallback={<LoadingFallback />} />;
export const LazyDashboard = () => <LazyRoute componentPath="Dashboard" fallback={<LoadingFallback />} />;
