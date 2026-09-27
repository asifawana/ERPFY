/**
 * Client-side image compression utility.
 *
 * Works exactly like WhatsApp's image pipeline:
 *   1. Decode the image into a bitmap
 *   2. Scale it down so neither dimension exceeds `maxDimension`
 *   3. Re-encode as WebP (or JPEG fallback when WebP is unsupported) at `quality`
 *
 * Everything runs in the browser — no bytes leave the device until the caller
 * decides to upload. The result is a data-URL that can be stored directly or
 * passed to a FormData / fetch body.
 *
 * Typical results (matching WhatsApp behaviour):
 *   - 5 MB photo  → ~150–350 KB  (quality 0.82, maxDimension 1600)
 *   - 500 KB logo → ~20–60 KB    (quality 0.90, maxDimension 512)
 */

export type CompressOptions = {
  /**
   * Longest edge in pixels. The image is scaled proportionally so neither
   * width nor height exceeds this value. Smaller images are never upscaled.
   * @default 1600
   */
  maxDimension?: number;

  /**
   * Re-encode quality, 0–1.  0.82 ≈ WhatsApp default.
   * Higher = better quality, larger file.
   * @default 0.82
   */
  quality?: number;

  /**
   * Preferred output mime type.  Falls back to 'image/jpeg' when the browser
   * does not support WebP encoding (very rare in 2026).
   * @default 'image/webp'
   */
  outputFormat?: 'image/webp' | 'image/jpeg' | 'image/png';
};

/**
 * Compresses a File or Blob and returns a data-URL string.
 *
 * @example
 * const compressed = await compressImage(file, { maxDimension: 512, quality: 0.88 });
 * setLogoDataUrl(compressed);
 */
export async function compressImage(
  source: File | Blob,
  options: CompressOptions = {},
): Promise<string> {
  const {
    maxDimension = 1600,
    quality = 0.82,
    outputFormat = 'image/webp',
  } = options;

  // 1. Decode to ImageBitmap (faster than drawImage on an <img>)
  const bitmap = await createImageBitmap(source);
  const { width, height } = bitmap;

  // 2. Calculate scaled dimensions — never upscale
  let targetW = width;
  let targetH = height;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    targetW = Math.round(width * ratio);
    targetH = Math.round(height * ratio);
  }

  // 3. Draw onto an OffscreenCanvas (or regular canvas as fallback)
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetW, targetH);
    ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  } else {
    const el = document.createElement('canvas');
    el.width = targetW;
    el.height = targetH;
    canvas = el;
    ctx = el.getContext('2d') as CanvasRenderingContext2D;
  }

  // High-quality downscaling
  (ctx as CanvasRenderingContext2D).imageSmoothingEnabled = true;
  (ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  // 4. Encode to the target format
  if (canvas instanceof OffscreenCanvas) {
    const blob = await canvas.convertToBlob({ type: outputFormat, quality });
    return blobToDataUrl(blob);
  } else {
    // HTMLCanvasElement.toDataURL is synchronous
    const dataUrl = (canvas as HTMLCanvasElement).toDataURL(outputFormat, quality);
    // If the browser returned 'image/png' despite requesting WebP, it doesn't
    // support WebP encoding — re-try with JPEG.
    if (outputFormat === 'image/webp' && dataUrl.startsWith('data:image/png')) {
      return (canvas as HTMLCanvasElement).toDataURL('image/jpeg', quality);
    }
    return dataUrl;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convenience wrapper that validates common upload constraints *before* compressing,
 * so the user gets an instant error without waiting for the canvas pipeline.
 *
 * @param file        The File from an <input type="file"> change event
 * @param maxBytes    Maximum *original* file size to accept (default 10 MB)
 * @param options     Passed directly to compressImage()
 *
 * @throws Error with a human-readable message when validation fails
 */
export async function validateAndCompress(
  file: File,
  maxBytes = 10 * 1024 * 1024,
  options: CompressOptions = {},
): Promise<string> {
  const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];
  if (!allowed.includes(file.type)) {
    throw new Error('Only PNG, JPG, WebP, GIF and AVIF images are supported.');
  }
  if (file.size > maxBytes) {
    const mb = (maxBytes / 1024 / 1024).toFixed(0);
    throw new Error(`Image must be ${mb} MB or smaller.`);
  }
  return compressImage(file, options);
}
