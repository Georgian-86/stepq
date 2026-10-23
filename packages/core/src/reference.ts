const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newReference(): string {
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

function words(full: string): string[] {
  return full.trim().split(/\s+/).filter(Boolean);
}

function cap(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

export function firstName(full: string): string {
  const [first] = words(full);
  return first ? cap(first) : '';
}

export function wallName(full: string): string {
  const parts = words(full);
  const first = parts[0];
  if (!first) return '';
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return cap(first);
  return `${cap(first)} ${last.charAt(0).toUpperCase()}.`;
}
