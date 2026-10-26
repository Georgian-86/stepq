import { ImageResponse } from 'next/og';
import { BRAND, pikoDataUri } from '@/lib/brandImage';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Home-screen icon on iPhone: Piko on leaf green (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: BRAND.leaf,
      }}
    >
      <img src={pikoDataUri('happy')} width={150} height={150} alt="" />
    </div>,
    size,
  );
}
