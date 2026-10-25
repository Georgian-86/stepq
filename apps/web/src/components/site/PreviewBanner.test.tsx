import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

async function load(flag: string) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_PREVIEW_MODE', flag);
  return (await import('./PreviewBanner')).PreviewBanner;
}

describe('PreviewBanner', () => {
  beforeEach(() => {
    pathname = '/';
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is a note saying forms save nothing, in preview builds', async () => {
    const PreviewBanner = await load('1');
    render(<PreviewBanner />);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent("Preview — forms don't save anything yet.");
    expect(note).not.toHaveTextContent('UPI');
    expect(note).toHaveClass('bg-mango-soft', 'text-ink');
  });

  it('warns on the fund pages that UPI payments are real', async () => {
    pathname = '/fund';
    const PreviewBanner = await load('1');
    render(<PreviewBanner />);
    expect(screen.getByRole('note')).toHaveTextContent(
      "Preview — forms don't save anything yet. UPI payments made here are real.",
    );
  });

  it('renders nothing when the flag is off', async () => {
    const PreviewBanner = await load('');
    const { container } = render(<PreviewBanner />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('note')).toBeNull();
  });
});
