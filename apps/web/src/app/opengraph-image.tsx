import { ImageResponse } from 'next/og';
import { BRAND, brandFonts, pikoDataUri } from '@/lib/brandImage';

export const alt = 'StepQ: walking, made a happy daily habit. Join the waitlist.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The card shown when a StepQ link is shared (WhatsApp, LinkedIn, X, Slack…). */
export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: BRAND.leaf,
        padding: '64px 72px',
        fontFamily: 'Nunito',
        color: BRAND.ink,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 28 }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Fredoka',
            fontSize: 64,
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          step<span style={{ color: BRAND.white }}>q</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Fredoka',
            fontSize: 76,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
          }}
        >
          Walking, made a happy daily habit.
        </div>
        <div style={{ display: 'flex', fontSize: 32, lineHeight: 1.3 }}>
          Piko pays you to walk. Join the waitlist.
        </div>
        <div
          style={{
            display: 'flex',
            alignSelf: 'flex-start',
            background: BRAND.white,
            borderRadius: 999,
            padding: '12px 26px',
            fontSize: 26,
            color: BRAND.deep,
          }}
        >
          Launching soon on Android and iPhone · stepq.in
        </div>
      </div>
      <img src={pikoDataUri('cheer')} width={380} height={380} alt="" />
    </div>,
    { ...size, fonts: await brandFonts() },
  );
}
