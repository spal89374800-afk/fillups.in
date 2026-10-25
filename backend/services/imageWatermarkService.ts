import { createRequire } from 'node:module';

/**
 * Live photo watermarking.
 *
 * Government/application photos par timestamp + Application/Order ID ka
 * watermark lagta hai taaki wo misuse na ho sake. Overlay server par hota hai
 * (client se aayi image ko trust nahi karte).
 *
 * `sharp` optional dependency hai. Install na ho to:
 *   - default me original image return hoti hai (dev friendly),
 *   - lekin LIVE_PHOTO_REQUIRE_WATERMARK=true set karte hi missing sharp par
 *     submit reject ho jaayega (production ke liye recommended).
 */

// ESM me native/optional module ko safely load karne ke liye createRequire.
const requireModule = createRequire(import.meta.url);

let sharpModule: {
  (input: Buffer | Uint8Array): {
    metadata(): Promise<{ width?: number; height?: number }>;
    composite(inputs: unknown[]): { jpeg(options?: { quality?: number }): { toBuffer(): Promise<Buffer> } };
  };
} | null = null;
let sharpLoadAttempted = false;

function getSharp() {
  if (!sharpLoadAttempted) {
    sharpLoadAttempted = true;
    try {
      sharpModule = requireModule('sharp');
    } catch {
      sharpModule = null;
    }
  }
  return sharpModule;
}

function isWatermarkRequired(): boolean {
  return process.env.LIVE_PHOTO_REQUIRE_WATERMARK === 'true';
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char] as string
  ));
}

/**
 * Image data URL par watermark (Application ID + timestamp) lagata hai.
 * Failure/absence par original data URL lautata hai (jab tak required na ho).
 */
export async function watermarkLivePhoto(
  imageDataUrl: string,
  { applicationId, timestamp }: { applicationId: string; timestamp: string }
): Promise<string> {
  const sharp = getSharp();
  if (!sharp) {
    if (isWatermarkRequired()) {
      throw new Error('Live photo watermark is required but the "sharp" package is not installed. Run: npm install sharp');
    }
    return imageDataUrl;
  }

  const base64 = imageDataUrl.split(',')[1];
  if (!base64) return imageDataUrl;
  const inputBuffer = Buffer.from(base64, 'base64');

  const meta = await sharp(inputBuffer).metadata();
  const width = meta.width || 720;
  const height = meta.height || 960;

  const fontSize = Math.max(16, Math.round(width * 0.03));
  const padding = Math.round(fontSize * 0.6);
  const bandHeight = Math.round(fontSize * 3);
  const line1 = `Application ID: ${applicationId}`;
  const line2 = `Captured: ${timestamp}`;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${height - bandHeight}" width="${width}" height="${bandHeight}" fill="rgba(2,6,23,0.6)"/>
      <text x="${padding}" y="${height - fontSize * 1.9}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#ffffff">${escapeXml(line1)}</text>
      <text x="${padding}" y="${height - fontSize * 0.7}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#cbd5e1">${escapeXml(line2)}</text>
    </svg>`;

  const outputBuffer = await sharp(inputBuffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();

  return `data:image/jpeg;base64,${outputBuffer.toString('base64')}`;
}

export function isLivePhotoWatermarkEnabled(): boolean {
  return getSharp() !== null;
}
