import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useAdaptiveImage,
  AdaptiveImageOptions,
} from "@/hooks/useAdaptiveImages";
import { Loader2, Wifi, WifiOff, ImageOff } from "lucide-react";

interface AdaptiveImageProps extends AdaptiveImageOptions {
  aspectRatio?: "square" | "portrait" | "landscape" | "auto";
  objectFit?: "cover" | "contain";
  showUpgradeHint?: boolean;
}

export const AdaptiveImage: React.FC<AdaptiveImageProps> = ({
  thumbnailUrl,
  smallUrl,
  mediumUrl,
  fullUrl,
  alt,
  className,
  aspectRatio = "auto",
  objectFit = "cover",
  showUpgradeHint = true,
  priority = false,
}) => {
  const {
    src,
    isLoading,
    error,
    speed,
    handleLoad,
    handleError,
    upgradeQuality,
  } = useAdaptiveImage({
    thumbnailUrl,
    smallUrl,
    mediumUrl,
    fullUrl,
    alt,
    priority,
  });

  const [showFullRes, setShowFullRes] = useState(false);

  const aspectClasses = {
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    landscape: "aspect-[4/3]",
    auto: "",
  };

  // Check if current image is not full resolution
  const canUpgrade = src !== fullUrl;

  // Show full res on click
  const handleClick = () => {
    if (canUpgrade && !showFullRes) {
      setShowFullRes(true);
      upgradeQuality();
    }
  };

  if (error) {
    return (
      <div
        className={cn(
          "bg-gray-100 flex items-center justify-center",
          aspectClasses[aspectRatio],
          className,
        )}
      >
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        aspectClasses[aspectRatio],
        canUpgrade && !showFullRes && "cursor-pointer",
        className,
      )}
      onClick={handleClick}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Main image */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "w-full h-full transition-opacity duration-300",
          objectFit === "cover" ? "object-cover" : "object-contain",
          isLoading ? "opacity-0" : "opacity-100",
        )}
      />

      {/* Connection speed indicator */}
      {showUpgradeHint && speed !== "4g" && speed !== "unknown" && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          {speed === "slow-2g" || speed === "2g" ? (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Slow connection - compressed</span>
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3" />
              <span>3G - optimized</span>
            </>
          )}
        </div>
      )}

      {/* Click to view full resolution hint */}
      {showUpgradeHint && canUpgrade && !showFullRes && !isLoading && (
        <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded text-center opacity-0 hover:opacity-100 transition-opacity">
          Click to view full resolution
        </div>
      )}
    </div>
  );
};

// ===== IMAGE UPLOAD PROGRESS WITH COMPRESSION =====

interface ImageUploadProgressProps {
  file: File;
  compressedFile?: File;
  progress: number;
  speed: string;
  estimatedTime: number;
  compressionRatio?: number | null;
  compressing: boolean;
}

export const ImageUploadProgress: React.FC<ImageUploadProgressProps> = ({
  file,
  compressedFile,
  progress,
  speed,
  estimatedTime,
  compressionRatio,
  compressing,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      {/* File info */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate max-w-[200px]">{file.name}</span>
        <span className="text-gray-500">
          {formatSize(compressedFile?.size || file.size)}
        </span>
      </div>

      {/* Compression info */}
      {compressing && (
        <div className="flex items-center gap-2 text-xs text-blue-600">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Compressing for {speed} connection...</span>
        </div>
      )}

      {compressionRatio !== null && compressionRatio !== undefined && (
        <div className="text-xs text-green-600">
          ✓ Compressed {compressionRatio}% smaller for faster upload
        </div>
      )}

      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{progress}% uploaded</span>
          {progress < 100 && estimatedTime > 0 && (
            <span>~{formatTime(estimatedTime)} remaining</span>
          )}
        </div>
      </div>

      {/* Connection info */}
      <div className="text-xs text-gray-400 flex items-center gap-1">
        <Wifi className="w-3 h-3" />
        <span>Optimized for {speed} connection</span>
      </div>
    </div>
  );
};
