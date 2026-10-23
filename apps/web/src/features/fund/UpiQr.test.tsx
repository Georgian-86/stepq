import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('qrcode', () => ({ default: { toString: () => Promise.reject(new Error('too long')) } }));
const { UpiQr } = await import('./UpiQr');

describe('UpiQr', () => {
  it('shows the UPI ID in the reserved box when the QR cannot be generated', async () => {
    render(<UpiQr link="upi://pay?pa=x" size={136} />);
    const fallback = await screen.findByText('Use UPI ID bhakti0parmar1@oksbi');
    expect(fallback).toHaveStyle({ width: '136px', height: '136px' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
