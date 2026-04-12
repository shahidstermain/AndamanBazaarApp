import { useState, useEffect, useCallback } from "react";
import imageCompression from "browser-image-compression";

export type ConnectionSpeed = "slow-2g" | "2g" | "3g" | "4g" | "unknown";
export type ImageVariant = "thumbnail" | "small" | "medium" | "full";

export interface AdaptiveImageOptions {
  thumbnailUrl?: string;
  smallUrl?: string;
  mediumUrl?: string;
  fullUrl: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

/**
 * Detect connection speed using Network Information API
 */
export function useConnectionSpeed(): ConnectionSpeed {
  const [speed, setSpeed] = useState<ConnectionSpeed>("unknown");

  useEffect(() => {
    const connection = (navigator as any).connection;

    if (connection) {
      const updateSpeed = () => {
        setSpeed(connection.effectiveType as ConnectionSpeed);
      };

      updateSpeed();
      connection.addEventListener("change", updateSpeed);
      return () => connection.removeEventListener("change", updateSpeed);
    }
  }, []);

  return speed;
}

/**
 * Determine which image variant to load based on connection speed
 */
export function getOptimalVariant(
  speed: ConnectionSpeed,
  options: AdaptiveImageOptions,
): string {
  switch (speed) {
    case "slow-2g":
    case "2g":
      return (
        options.thumbnailUrl ||
        options.smallUrl ||
        options.mediumUrl ||
        options.fullUrl
      );
    case "3g":
      return options.smallUrl || options.mediumUrl || options.fullUrl;
    case "4g":
    case "unknown":
    default:
      return options.mediumUrl || options.fullUrl;
  }
}

/**
 * Hook for adaptive image loading
 */
export function useAdaptiveImage(options: AdaptiveImageOptions) {
  const speed = useConnectionSpeed();
  const [currentSrc, setCurrentSrc] = useState<string>(() =>
    getOptimalVariant(speed, options),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Update src when connection changes
  useEffect(() => {
    const optimalSrc = getOptimalVariant(speed, options);
    if (optimalSrc !== currentSrc) {
      setCurrentSrc(optimalSrc);
      setIsLoading(true);
      setError(null);
    }
  }, [speed, options, currentSrc]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setError(new Error("Failed to load image"));
    // Fallback to full resolution
    if (currentSrc !== options.fullUrl) {
      setCurrentSrc(options.fullUrl);
    }
  }, [currentSrc, options.fullUrl]);

  // Upgrade quality if user clicks image (prefers larger)
  const upgradeQuality = useCallback(() => {
    if (currentSrc === options.thumbnailUrl && options.smallUrl) {
      setCurrentSrc(options.smallUrl);
    } else if (
      (currentSrc === options.thumbnailUrl ||
        currentSrc === options.smallUrl) &&
      options.mediumUrl
    ) {
      setCurrentSrc(options.mediumUrl);
    } else if (currentSrc !== options.fullUrl) {
      setCurrentSrc(options.fullUrl);
    }
  }, [currentSrc, options]);

  return {
    src: currentSrc,
    isLoading,
    error,
    speed,
    handleLoad,
    handleError,
    upgradeQuality,
  };
}

// ===== IMAGE COMPRESSION =====

export interface CompressionOptions {
  maxWidthOrHeight?: number;
  maxSizeMB?: number;
  quality?: number;
  fileType?: string;
}

/**
 * Compress image before upload based on connection speed
 */
export async function compressForUpload(
  file: File,
  speed: ConnectionSpeed,
): Promise<File> {
  const options: CompressionOptions = {
    fileType: "image/jpeg",
  };

  switch (speed) {
    case "slow-2g":
    case "2g":
      options.maxWidthOrHeight = 800;
      options.maxSizeMB = 0.3;
      options.quality = 0.5;
      break;
    case "3g":
      options.maxWidthOrHeight = 1200;
      options.maxSizeMB = 0.8;
      options.quality = 0.7;
      break;
    case "4g":
    case "unknown":
    default:
      options.maxWidthOrHeight = 1600;
      options.maxSizeMB = 2;
      options.quality = 0.85;
      break;
  }

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error("Image compression failed:", error);
    // Return original if compression fails
    return file;
  }
}

/**
 * Get estimated upload time in seconds
 */
export function estimateUploadTime(
  fileSizeBytes: number,
  speed: ConnectionSpeed,
): number {
  // Approximate speeds in bytes per second
  const speeds: Record<ConnectionSpeed, number> = {
    "slow-2g": 10 * 1024, // ~10 KB/s
    "2g": 30 * 1024, // ~30 KB/s
    "3g": 500 * 1024, // ~500 KB/s
    "4g": 5 * 1024 * 1024, // ~5 MB/s
    unknown: 1 * 1024 * 1024, // ~1 MB/s (conservative)
  };

  const bytesPerSecond = speeds[speed] || speeds["unknown"];
  return Math.ceil(fileSizeBytes / bytesPerSecond);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Hook for image upload with compression
 */
export function useImageUploadWithCompression() {
  const speed = useConnectionSpeed();
  const [compressing, setCompressing] = useState(false);
  const [compressionRatio, setCompressionRatio] = useState<number | null>(null);

  const compressImage = useCallback(
    async (file: File): Promise<File> => {
      setCompressing(true);
      setCompressionRatio(null);

      try {
        const originalSize = file.size;
        const compressedFile = await compressForUpload(file, speed);
        const compressedSize = compressedFile.size;

        const ratio = Math.round(
          ((originalSize - compressedSize) / originalSize) * 100,
        );
        setCompressionRatio(ratio);

        return compressedFile;
      } finally {
        setCompressing(false);
      }
    },
    [speed],
  );

  return {
    speed,
    compressing,
    compressionRatio,
    compressImage,
    estimateTime: (fileSize: number) => estimateUploadTime(fileSize, speed),
  };
}
