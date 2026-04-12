import React, { useState } from "react";
import { ImageOff } from "lucide-react";

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string;
}

/**
 * SafeImage — an <img> wrapper with loading skeleton, error fallback,
 * and lazy loading. Prevents broken image icons in the UI.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = "",
  fallbackText,
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  if (errored || !src) {
    return (
      <div
        className={`bg-slate-100 flex items-center justify-center ${className}`}
        {...props}
      >
        <div className="text-center p-2">
          <ImageOff size={20} className="mx-auto text-slate-300 mb-1" />
          {fallbackText && (
            <span className="text-[9px] text-slate-400 font-medium">
              {fallbackText}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className={`bg-slate-100 animate-pulse ${className}`} {...props} />
      )}
      <img
        src={src}
        alt={alt || ""}
        loading="lazy"
        className={`${className} ${loaded ? "" : "hidden"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        {...props}
      />
    </>
  );
};
