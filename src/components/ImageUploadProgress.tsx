import React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ImageUploadProgressProps {
  progress: number;
  total: number;
  current: number;
  className?: string;
}

export const ImageUploadProgress: React.FC<ImageUploadProgressProps> = ({
  progress,
  total,
  current,
  className,
}) => {
  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex justify-between text-sm font-medium text-slate-600">
        <span>Uploading images...</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-slate-400 text-right">
        {Math.round(progress)}%
      </p>
    </div>
  );
};
