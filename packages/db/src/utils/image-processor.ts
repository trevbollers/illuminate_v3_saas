import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

interface ProcessedImage {
  filename: string;
  url: string;
  width: number;
  height: number;
  format: "webp" | "svg";
  sizeBytes: number;
}

/**
 * Process an uploaded image file:
 * - SVGs pass through as-is (already scalable)
 * - All raster images convert to webp (smaller, scalable)
 * - Resizes to fit within maxDimension while maintaining aspect ratio
 *
 * In dev: saves to public/uploads/
 * In production: swap to S3/Cloudinary upload.
 */
export async function processUploadedImage(
  file: File,
  prefix: string,
  options?: { maxDimension?: number; quality?: number },
): Promise<ProcessedImage> {
  const maxDim = options?.maxDimension || 1200;
  const quality = options?.quality || 80;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF, SVG");
  }

  if (file.size > MAX_SIZE) {
    throw new Error("File too large. Maximum 5MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // SVGs pass through — already vector, no conversion needed
  if (file.type === "image/svg+xml") {
    const filename = `${prefix}-${Date.now()}.svg`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return {
      filename,
      url: `/uploads/${filename}`,
      width: 0,
      height: 0,
      format: "svg",
      sizeBytes: buffer.length,
    };
  }

  // Raster images → webp
  let pipeline = sharp(buffer);
  const metadata = await pipeline.metadata();

  // Resize if larger than maxDimension
  const w = metadata.width || 0;
  const h = metadata.height || 0;
  if (w > maxDim || h > maxDim) {
    pipeline = pipeline.resize(maxDim, maxDim, { fit: "inside", withoutEnlargement: true });
  }

  const webpBuffer = await pipeline.webp({ quality }).toBuffer();
  const webpMeta = await sharp(webpBuffer).metadata();

  const filename = `${prefix}-${Date.now()}.webp`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), webpBuffer);

  return {
    filename,
    url: `/uploads/${filename}`,
    width: webpMeta.width || 0,
    height: webpMeta.height || 0,
    format: "webp",
    sizeBytes: webpBuffer.length,
  };
}
