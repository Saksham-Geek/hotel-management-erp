import sharp from 'sharp';
import type { WatermarkMeta } from './pdf-watermark';

/**
 * Stamps an indelible forensic watermark directly into the pixel data of an image (JPEG, PNG, WebP).
 * This ensures that whether viewed, downloaded, or printed, the resulting image file
 * contains the exact same 12-tile forensic grid, statutory audit strip, and security tint.
 */
export async function watermarkImage(
  buffer: Buffer,
  mimeType: string,
  meta: WatermarkMeta,
): Promise<{ buffer: Buffer; mimeType: string }> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = metadata.width || 1200;
    const height = metadata.height || 800;

    // Clean ASCII metadata to guarantee clean vector rendering
    const cleanAscii = (text: string) => text.replace(/[^\x20-\x7E]/g, ' ').trim();
    const staffUpper = cleanAscii(meta.staffName || 'Authorized Operator').toUpperCase();
    const roleUpper = cleanAscii(meta.staffRole || 'STAFF').toUpperCase();
    const timestampClean = cleanAscii(meta.timestamp || new Date().toISOString());

    // Responsive font sizing based on image dimensions
    const baseScale = Math.max(0.6, Math.min(2.5, width / 1000));
    const titleSize = Math.round(13 * baseScale);
    const bodySize = Math.round(11 * baseScale);
    const timeSize = Math.round(9.5 * baseScale);
    const bannerHeight = Math.round(28 * baseScale);
    const bannerTextSize = Math.round(10.5 * baseScale);

    // 12-tile repeating diagonal forensic watermark grid (3 columns x 4 rows)
    const cols = 3;
    const rows = 4;
    const stepX = width / cols;
    const stepY = height / rows;

    let tiles = '';
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cx = (c + 0.5) * stepX;
        const cy = (r + 0.5) * stepY;
        tiles += `
          <g transform="translate(${cx}, ${cy}) rotate(-28)">
            <text x="0" y="-${14 * baseScale}" text-anchor="middle" font-family="monospace, sans-serif" font-size="${titleSize}" font-weight="bold" fill="rgba(35, 45, 65, 0.28)">CONFIDENTIAL PROPERTY RECORD</text>
            <text x="0" y="${3 * baseScale}" text-anchor="middle" font-family="monospace, sans-serif" font-size="${bodySize}" font-weight="bold" fill="rgba(35, 45, 65, 0.28)">VIEWED BY: ${staffUpper} (${roleUpper})</text>
            <text x="0" y="${19 * baseScale}" text-anchor="middle" font-family="monospace, sans-serif" font-size="${timeSize}" font-weight="bold" fill="rgba(35, 45, 65, 0.24)">${timestampClean}</text>
          </g>
        `;
      }
    }

    const svgOverlay = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <!-- Security tint -->
        <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(245, 235, 220, 0.10)" />

        <!-- Top statutory security banner -->
        <rect x="0" y="0" width="${width}" height="${bannerHeight}" fill="rgba(240, 232, 220, 0.95)" />
        <text x="14" y="${bannerHeight * 0.65}" font-family="sans-serif" font-size="${bannerTextSize}" font-weight="bold" fill="rgba(165, 30, 30, 1)">[RESTRICTED] STATUTORY HOTEL COMPLIANCE RECORD | CONFIDENTIAL PROPERTY RECORD</text>

        <!-- Bottom statutory audit banner -->
        <rect x="0" y="${height - bannerHeight}" width="${width}" height="${bannerHeight}" fill="rgba(240, 232, 220, 0.95)" />
        <text x="14" y="${height - bannerHeight * 0.35}" font-family="sans-serif" font-size="${bannerTextSize * 0.9}" font-weight="bold" fill="rgba(45, 45, 45, 1)">ACCESSED BY: ${staffUpper} (${roleUpper}) | ${timestampClean} | ZERO-DESKTOP PROTECTED</text>

        <!-- 12-tile repeating forensic watermark grid -->
        ${tiles}
      </svg>
    `;

    let pipeline = sharp(buffer).composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }]);

    let outputBuffer: Buffer;
    let outputMime = mimeType;

    if (mimeType === 'image/png') {
      outputBuffer = await pipeline.png().toBuffer();
    } else if (mimeType === 'image/webp') {
      outputBuffer = await pipeline.webp({ quality: 90 }).toBuffer();
    } else {
      // Default to JPEG with high fidelity
      outputBuffer = await pipeline.jpeg({ quality: 90 }).toBuffer();
      outputMime = 'image/jpeg';
    }

    return { buffer: outputBuffer, mimeType: outputMime };
  } catch (err) {
    console.error('[watermarkImage] Error stamping watermark on image:', err);
    return { buffer, mimeType };
  }
}
