/**
 * Client-side image compression.
 *
 * Phone photos from modern cameras can be 5-10 MB raw. Sending them as
 * base64 inside a JSON body (analyze-meal) exceeds Vercel's 4.5 MB serverless
 * limit and the user sees a generic "failed" error. Uploading them as-is to
 * Firebase Storage also wastes bandwidth and storage cost.
 *
 * Default target: max 1280px on the longest side at 85% JPEG quality —
 * typically 200-500 KB. Plenty of resolution for vision models and feed
 * thumbnails. Avatars use 512px since they render small.
 *
 * Both helpers gracefully fall back to the original file if Canvas isn't
 * available or the image fails to decode.
 */

export interface CompressOptions {
  /** Max dimension on the longest side, in pixels. Default 1280. */
  maxDim?: number;
  /** JPEG quality 0–1. Default 0.85. */
  quality?: number;
}

async function drawToCanvas(file: File, maxDim: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = URL.createObjectURL(file);
  });
}

/** Compress a file to a JPEG data URL (base64). */
export async function compressImageToDataUrl(
  file: File,
  opts: CompressOptions = {}
): Promise<string> {
  const { maxDim = 1280, quality = 0.85 } = opts;
  try {
    const canvas = await drawToCanvas(file, maxDim);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    // Fall back to the original file as data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

/** Compress a file to a JPEG Blob — ideal for direct upload to Firebase Storage. */
export async function compressImageToBlob(
  file: File,
  opts: CompressOptions = {}
): Promise<Blob> {
  const { maxDim = 1280, quality = 0.85 } = opts;
  try {
    const canvas = await drawToCanvas(file, maxDim);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        },
        "image/jpeg",
        quality
      );
    });
  } catch {
    // Fall back to the raw file
    return file;
  }
}
