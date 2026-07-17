const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSourceBytes = 12 * 1024 * 1024;

export interface PreparedImage {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
}

export async function preparePrivateAlphaImage(
  file: File,
  options: { maxDimension?: number; maxOutputBytes?: number } = {},
): Promise<PreparedImage> {
  if (!supportedImageTypes.has(file.type)) throw new Error("unsupported_image");
  if (file.size > maxSourceBytes) throw new Error("image_too_large");

  const maxDimension = options.maxDimension ?? 1600;
  const maxOutputBytes = options.maxOutputBytes ?? 520 * 1024;
  const sourceUrl = URL.createObjectURL(file);

  try {
    const source = await loadImage(sourceUrl);
    const scale = Math.min(1, maxDimension / Math.max(source.naturalWidth, source.naturalHeight));
    let width = Math.max(1, Math.round(source.naturalWidth * scale));
    let height = Math.max(1, Math.round(source.naturalHeight * scale));
    let quality = 0.82;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("image_processing_unavailable");
      context.drawImage(source, 0, 0, width, height);
      blob = await canvasToBlob(canvas, "image/webp", quality);
      if (blob.type !== "image/webp") {
        blob = await canvasToBlob(canvas, "image/jpeg", quality);
      }
      if (blob.size <= maxOutputBytes) break;
      quality = Math.max(0.62, quality - 0.06);
      width = Math.max(1, Math.round(width * 0.88));
      height = Math.max(1, Math.round(height * 0.88));
    }

    if (!blob || blob.size > maxOutputBytes) throw new Error("image_output_too_large");
    return {
      dataUrl: await blobToDataUrl(blob),
      mimeType: blob.type || "image/webp",
      sizeBytes: blob.size,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image_decode_failed"));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("image_encode_failed")),
      type,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("image_read_failed"));
    reader.readAsDataURL(blob);
  });
}
