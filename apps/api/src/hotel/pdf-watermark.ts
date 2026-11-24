import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface WatermarkMeta {
  staffName: string;
  staffRole: string;
  timestamp: string;
  guestId?: string;
}

/**
 * Stamps an indelible forensic watermark and security filter directly into the PDF pages.
 * Stamped into the actual PDF binary vectors so that whenever the PDF is viewed,
 * printed (Ctrl+P or browser print), or downloaded, every page permanently contains:
 * 1. Full-page security tint filter.
 * 2. Top and bottom statutory audit banners with staff identity and timestamp.
 * 3. 12-tile repeating diagonal forensic watermark grid matching the secure viewer.
 */
export async function watermarkPdf(buffer: Buffer, meta: WatermarkMeta): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;

    // Sanitize metadata to pure ASCII to guarantee standard font WinAnsi compatibility
    const cleanAscii = (text: string) => text.replace(/[^\x20-\x7E]/g, ' ').trim();
    const staffUpper = cleanAscii(meta.staffName || 'Authorized Operator').toUpperCase();
    const roleUpper = cleanAscii(meta.staffRole || 'STAFF').toUpperCase();
    const timestampClean = cleanAscii(meta.timestamp || new Date().toISOString());

    for (let i = 0; i < pageCount; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      // 1. Full-page security filter tint
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: rgb(0.97, 0.95, 0.91),
        opacity: 0.10,
      });

      // 2. Top security header banner
      page.drawRectangle({
        x: 0,
        y: height - 24,
        width,
        height: 24,
        color: rgb(0.95, 0.92, 0.86),
        opacity: 0.96,
      });
      page.drawText('[RESTRICTED] STATUTORY HOTEL COMPLIANCE RECORD | CONFIDENTIAL PROPERTY RECORD', {
        x: 14,
        y: height - 16,
        size: 8,
        font: boldFont,
        color: rgb(0.65, 0.15, 0.15),
      });

      // 3. Bottom security audit banner with staff identity and timestamp
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height: 22,
        color: rgb(0.95, 0.92, 0.86),
        opacity: 0.96,
      });
      page.drawText(
        `ACCESSED BY: ${staffUpper} (${roleUpper}) | ${timestampClean} | PAGE ${i + 1} OF ${pageCount} | ZERO-DESKTOP PROTECTED`,
        {
          x: 14,
          y: 7,
          size: 7.5,
          font: regularFont,
          color: rgb(0.25, 0.25, 0.25),
        },
      );

      // 4. Repeating forensic watermark grid across the whole page (3 columns x 4 rows)
      const cols = 3;
      const rows = 4;
      const stepX = width / cols;
      const stepY = height / rows;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = (c + 0.5) * stepX - 60;
          const y = (r + 0.5) * stepY;

          page.drawText('CONFIDENTIAL PROPERTY RECORD', {
            x,
            y: y + 16,
            size: 9.5,
            font: boldFont,
            color: rgb(0.25, 0.28, 0.35),
            opacity: 0.24,
            rotate: degrees(-28),
          });

          page.drawText(`VIEWED BY: ${staffUpper} (${roleUpper})`, {
            x,
            y,
            size: 8.5,
            font: boldFont,
            color: rgb(0.25, 0.28, 0.35),
            opacity: 0.24,
            rotate: degrees(-28),
          });

          page.drawText(timestampClean, {
            x,
            y: y - 14,
            size: 7.5,
            font: regularFont,
            color: rgb(0.25, 0.28, 0.35),
            opacity: 0.22,
            rotate: degrees(-28),
          });
        }
      }
    }

    return await pdfDoc.save();
  } catch (err) {
    console.error('[watermarkPdf] Error stamping watermark on PDF:', err);
    return buffer;
  }
}
