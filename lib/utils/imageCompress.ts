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
 * HEIC/HEIF (the default camera format on iPhone, and on many Android
 * phones with "efficient format" enabled) is converted to JPEG first via
 * heic2any — most WebViews' <img>/Canvas can't decode HEIC at all, so
 * without this step both the preview AND the eventual Claude vision call
 * silently fail: the old fallback path here read the raw undecoded HEIC
 * bytes and mislabeled them as JPEG, which Claude's API correctly rejected
 * with a cryptic "Could not process image" (found 2026-09-07, a real
 * customer hit this picking a photo from their gallery).
 */

export interface CompressOptions {
  /** Max dimension on the longest side, in pixels. Default 1280. */
  maxDim?: number;
  /** JPEG quality 0–1. Default 0.85. */
  quality?: number;
}

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  return type === "image/heic" || type === "image/heif" || /\.hei[cf]$/i.test(file.name);
}

/** Converts HEIC/HEIF to JPEG via heic2any (WASM, loaded on demand — most
 * files aren't HEIC, so this shouldn't cost anything for the common case).
 * Returns the original file unchanged if it isn't HEIC or conversion fails
 * (the caller's own decode step will then fail with a clear error instead
 * of silently mislabeling raw HEIC bytes). */
async function toJpegIfHeic(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    return new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" });
  } catch (err) {
    console.error("HEIC conversion failed", err);
    return file;
  }
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

/** True for the image types Claude's vision API (and this app's other
 * consumers) actually accept — used to refuse a bad fallback rather than
 * silently mislabeling unsupported bytes as JPEG. */
function isSupportedDataUrl(url: string): boolean {
  return /^data:image\/(jpeg|jpg|png|gif|webp);base64,/i.test(url);
}

/**
 * Reads the real media type out of a data URL instead of guessing. Several
 * call sites used to special-case "starts with data:image/png, else assume
 * jpeg" — harmless when compressImageToDataUrl always produced a genuine
 * JPEG, but that assumption broke silently for the HEIC fallback path (see
 * above): non-JPEG bytes got labeled "image/jpeg" and sent to Claude's API
 * as if they were, which it correctly rejected. Defaults to jpeg only if
 * the prefix truly can't be read at all.
 */
export function dataUrlMediaType(url: string): "image/jpeg" | "image/png" {
  const match = /^data:(image\/[a-z]+);base64,/i.exec(url);
  return match?.[1]?.toLowerCase() === "image/png" ? "image/png" : "image/jpeg";
}

/** Compress a file to a JPEG data URL (base64). Throws if the file can't be
 * decoded into a supported format at all (e.g. HEIC conversion failed) —
 * callers should catch this and show the user a clear message, rather than
 * silently sending unusable data to the analysis API. */
export async function compressImageToDataUrl(
  file: File,
  opts: CompressOptions = {}
): Promise<string> {
  const { maxDim = 1280, quality = 0.85 } = opts;
  const normalized = await toJpegIfHeic(file);
  try {
    const canvas = await drawToCanvas(normalized, maxDim);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    // Fall back to the original file as data URL — but only if it's
    // actually a format we can use; otherwise this would just push the
    // same "unreadable image" problem one step further down the pipeline.
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(normalized);
    });
    if (!isSupportedDataUrl(raw)) {
      throw new Error("Unsupported image format — please pick a JPEG, PNG, GIF, or WebP photo");
    }
    return raw;
  }
}

/** Compress a file to a JPEG Blob — ideal for direct upload to Firebase Storage. */
export async function compressImageToBlob(
  file: File,
  opts: CompressOptions = {}
): Promise<Blob> {
  const { maxDim = 1280, quality = 0.85 } = opts;
  const normalized = await toJpegIfHeic(file);
  try {
    const canvas = await drawToCanvas(normalized, maxDim);
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
    // Fall back to the (possibly HEIC-converted) file — still better than
    // the untouched original if conversion at least succeeded.
    return normalized;
  }
}
