import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let emit: ((data: unknown) => void) | undefined;
vi.mock('@/lib/usePublicDoc', async () => {
  const { useEffect, useState } = await import('react');
  return {
    usePublicDoc: () => {
      const [v, set] = useState<unknown>(undefined);
      useEffect(() => {
        emit = set;
      }, []);
      return v;
    },
  };
});

const { LiveCount } = await import('./LiveCount');

describe('LiveCount', () => {
  beforeEach(() => {
    emit = undefined;
    // Reduced motion: the number changes instantly.
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) =>
        ({
          matches: q.includes('reduce'),
          media: q,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
  });

  it('keeps its space but shows nothing until the first snapshot', () => {
    const { container } = render(<LiveCount />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toBeEmptyDOMElement();
    expect(container.querySelector('[data-live-pill]')).toHaveClass('invisible');
    expect(container).not.toHaveTextContent(/\d/);
  });

  it('announces one sentence with the en-IN formatted real count', async () => {
    const { container } = render(<LiveCount />);
    await act(async () => emit!({ waitlistCount: 0 }));
    expect(screen.getByRole('status')).toHaveTextContent('0 people have joined the waitlist');
    await act(async () => emit!({ waitlistCount: 123456 }));
    expect(screen.getByRole('status')).toHaveTextContent(
      '1,23,456 people have joined the waitlist',
    );
    expect(container.querySelector('[data-live-pill]')).not.toHaveClass('invisible');
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('treats a missing stats doc as zero', async () => {
    render(<LiveCount />);
    await act(async () => emit!(null));
    expect(screen.getByRole('status')).toHaveTextContent('0 people have joined the waitlist');
  });
});
