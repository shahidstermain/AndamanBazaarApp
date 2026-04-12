import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getThumbnailUrl(
  url: string,
  width = 400,
  height = 400,
): string {
  if (!url) return url;
  if (url.includes("/storage/v1/object/public/")) {
    return (
      url.replace(
        "/storage/v1/object/public/",
        `/storage/v1/render/image/public/`,
      ) + `?width=${width}&height=${height}&resize=cover`
    );
  }
  return url;
}

export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.8,
): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.size < 100 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
