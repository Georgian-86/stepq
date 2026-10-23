import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

const { BackersWall } = await import('./BackersWall');

describe('BackersWall', () => {
  it('is hidden before data, for a missing doc and for an empty list', async () => {
    const { container } = render(<BackersWall />);
    expect(container).toBeEmptyDOMElement();
    await act(async () => emit!(null));
    expect(container).toBeEmptyDOMElement();
    await act(async () => emit!({ names: [] }));
    expect(container).toBeEmptyDOMElement();
  });

  it('lists verified backer names', async () => {
    render(<BackersWall />);
    await act(async () => emit!({ names: ['Riya S.', 'Aman G.'] }));
    expect(screen.getByRole('heading', { name: 'Our early backers' })).toBeInTheDocument();
    expect(screen.getByText('Names appear after StepQ verifies the payment.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Riya S.',
      'Aman G.',
    ]);
  });
});
