/**
 * Generates a standardized, clean statutory file name for guest identity documents:
 * <person-name>-<document-type>-watermarked.<ext> (when watermarked)
 * <person-name>-<document-type>.<ext> (base storage)
 *
 * Example:
 * formatDocumentFileName("Saksham Pethkar", "aadhaar_masked", "pdf", true)
 * => "saksham-pethkar-aadhaar-watermarked.pdf"
 */
export function formatDocumentFileName(
  personName: string | undefined | null,
  documentType: string | undefined | null,
  extensionOrMime: string | undefined | null,
  watermarked = true,
): string {
  // Normalize person name: e.g. "Saksham Pethkar" -> "saksham-pethkar"
  const cleanPerson = (personName || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'guest';

  // Normalize document type: e.g. "aadhaar_masked" -> "aadhaar", "driving_license" -> "driving-license"
  let cleanType = (documentType || 'id')
    .trim()
    .toLowerCase()
    .replace(/_masked$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'id';

  // Normalize extension
  let ext = (extensionOrMime || 'jpg').trim().toLowerCase();
  if (ext.includes('/')) {
    // It's a mime type like 'application/pdf' or 'image/jpeg'
    ext = ext === 'application/pdf' ? 'pdf' : ext === 'image/jpeg' ? 'jpg' : ext.split('/')[1] || 'jpg';
  } else {
    ext = ext.replace(/^\./, '');
    if (ext === 'jpeg') ext = 'jpg';
  }

  const suffix = watermarked ? '-watermarked' : '';
  return `${cleanPerson}-${cleanType}${suffix}.${ext}`;
}
