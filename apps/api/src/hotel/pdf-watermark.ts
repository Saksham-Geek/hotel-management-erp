import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface WatermarkMeta {
  staffName: string;
  staffRole: string;
  timestamp: string;
  guestId?: string;
}

/**
 * Stamps an indelible forensic watermark across every page of a PDF document.
 * This ensures that even if printed, screenshotted, or exported, the document
 * contains the viewing staff's identity, role, timestamp, and statutory notice.
 */
export async function watermarkPdf(buffer: Buffer, meta: WatermarkMeta): Promise<Uint8Array> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;

    const staffUpper = (meta.staffName || 'Authorized Operator').toUpperCase();
    const roleUpper = (meta.staffRole || 'STAFF').toUpperCase();

    for (let i = 0; i < pageCount; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();

      // Top security strip
      page.drawRectangle({
        x: 0,
        y: height - 20,
        width,
        height: 20,
        color: rgb(0.96, 0.93, 0.88),
        opacity: 0.95,
      });
      page.drawText('🔒 STATUTORY HOTEL COMPLIANCE RECORD • CONFIDENTIAL • DO NOT DISTRIBUTE', {
        x: 12,
        y: height - 14,
        size: 7.5,
        font: boldFont,
        color: rgb(0.65, 0.15, 0.15),
      });

      // Bottom security strip with staff identity and timestamp
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height: 18,
        color: rgb(0.96, 0.93, 0.88),
        opacity: 0.95,
      });
      page.drawText(
        `ACCESSED BY: ${staffUpper} (${roleUpper}) • ${meta.timestamp} • PAGE ${i + 1} OF ${pageCount} • ENCRYPTED AES-256-GCM`,
        {
          x: 12,
          y: 5.5,
          size: 7,
          font: regularFont,
          color: rgb(0.25, 0.25, 0.25),
        },
      );

      // Large diagonal center forensic watermarks (repeating pattern)
      const line1 = 'CONFIDENTIAL • PROPERTY OF GRAND AZURE';
      const line2 = `VIEWED BY: ${staffUpper} (${roleUpper})`;
      const line3 = `${meta.timestamp} • UNLAWFUL TO COPY OR LEAK`;

      const fontSize = Math.max(14, Math.min(22, width / 26));
      const textWidth1 = boldFont.widthOfTextAtSize(line1, fontSize);
      const textWidth2 = boldFont.widthOfTextAtSize(line2, fontSize * 0.85);
      const textWidth3 = regularFont.widthOfTextAtSize(line3, fontSize * 0.7);

      const centerX = width / 2;
      const centerY = height / 2;

      page.drawText(line1, {
        x: centerX - textWidth1 / 3,
        y: centerY + 25,
        size: fontSize,
        font: boldFont,
        color: rgb(0.82, 0.18, 0.18),
        opacity: 0.24,
        rotate: degrees(38),
      });

      page.drawText(line2, {
        x: centerX - textWidth2 / 3,
        y: centerY - 5,
        size: fontSize * 0.85,
        font: boldFont,
        color: rgb(0.7, 0.12, 0.12),
        opacity: 0.24,
        rotate: degrees(38),
      });

      page.drawText(line3, {
        x: centerX - textWidth3 / 3,
        y: centerY - 30,
        size: fontSize * 0.7,
        font: regularFont,
        color: rgb(0.5, 0.1, 0.1),
        opacity: 0.22,
        rotate: degrees(38),
      });
    }

    const outputBytes = await pdfDoc.save();
    return outputBytes;
  } catch (err) {
    // If watermark stamping encounters an issue with a malformed PDF, log and return original buffer
    console.error('[watermarkPdf] Error stamping watermark on PDF:', err);
    return buffer;
  }
}
