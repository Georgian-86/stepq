import { RESUME_MAX_BYTES } from '@stepq/schemas';

/** Same copy as the server's `resume` field error. */
export const RESUME_ERROR = 'Upload a PDF up to 5 MB';

/** A PDF by name and type (an empty type is allowed: some systems do not report one). */
export function looksLikePdf(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith('.pdf') &&
    (file.type === 'application/pdf' || file.type === '') &&
    file.size > 0 &&
    file.size <= RESUME_MAX_BYTES
  );
}

/**
 * Reads a résumé with FileReader into bare base64 (no data: prefix) for
 * `submitTeamApplication`. Rejects with RESUME_ERROR unless it is a PDF (name, type and the
 * `%PDF-` header) of at most RESUME_MAX_BYTES; size and type are checked before reading.
 */
export function readResume(file: File): Promise<{ fileName: string; base64: string }> {
  if (!looksLikePdf(file)) return Promise.reject(new Error(RESUME_ERROR));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(RESUME_ERROR));
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : '';
      const base64 = url.slice(url.indexOf(',') + 1);
      let head = '';
      try {
        head = atob(base64.slice(0, 8));
      } catch {
        // not base64: falls through to the rejection below
      }
      if (!head.startsWith('%PDF-')) reject(new Error(RESUME_ERROR));
      else resolve({ fileName: file.name.slice(-200), base64 });
    };
    reader.readAsDataURL(file);
  });
}
