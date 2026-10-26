import { ImageResponse } from 'next/og';
import { BRAND, brandFonts } from '@/lib/brandImage';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** Favicon: the wordmark's "q" in white on leaf green. */
export default async function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND.leaf,
        borderRadius: 16,
        color: BRAND.white,
        fontFamily: 'Fredoka',
        fontSize: 56,
        lineHeight: 1,
        paddingBottom: 12,
      }}
    >
      q
    </div>,
    { ...size, fonts: await brandFonts() },
  );
}
