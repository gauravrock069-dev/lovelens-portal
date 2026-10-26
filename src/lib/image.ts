// Browser-only: builds the thumbnail, preview and blur placeholder before upload.
function resize(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", quality),
  );
}

function blurDataUrl(bitmap: ImageBitmap): string {
  const w = 20;
  const h = Math.max(1, Math.round((bitmap.height / bitmap.width) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.5);
}

export async function prepareImage(file: File) {
  // "from-image" applies EXIF rotation so width/height match what people see
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const thumb = await resize(bitmap, 900, 0.8);
    const preview = await resize(bitmap, 2400, 0.85);
    return { width: bitmap.width, height: bitmap.height, thumb, preview, blur: blurDataUrl(bitmap) };
  } finally {
    bitmap.close();
  }
}
