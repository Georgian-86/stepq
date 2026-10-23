export type Platform = 'android' | 'ios' | 'desktop';

/** Coarse platform for choosing the UPI flow (Android chooser vs iOS app sheet). */
export function detectPlatform(
  ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  maxTouchPoints: number = typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
): Platform {
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  // iPadOS Safari reports itself as a Mac in desktop mode.
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return 'ios';
  return 'desktop';
}
