import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CountryPicker, filterCountries } from './CountryPicker';

function Harness({ initial, spy }: { initial?: string; spy?: (v: string) => void }) {
  const [value, setValue] = useState<string | undefined>(initial);
  return (
    <CountryPicker
      label="Country"
      value={value}
      onChange={(v) => {
        spy?.(v);
        setValue(v);
      }}
    />
  );
}

const names = (q: string) => filterCountries(q).map((o) => o.name);

describe('filterCountries', () => {
  it('lists India first, then A–Z', () => {
    expect(names('').slice(0, 3)).toEqual(['India', 'Afghanistan', 'Åland Islands']);
  });
  it('matches the start of any word, ignoring case and accents', () => {
    expect(names('ARAB')).toEqual(['Saudi Arabia', 'United Arab Emirates']);
    expect(names('cote')).toEqual(['Côte d’Ivoire']);
  });
  it('matches codes and common other names', () => {
    expect(names('usa')).toEqual(['United States']);
    expect(names('uk')).toContain('United Kingdom');
    expect(names('turkey')).toEqual(['Türkiye']);
    expect(names('in')).toContain('India');
  });
});

describe('CountryPicker', () => {
  it('filters as you type and picks with the keyboard', async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const box = screen.getByRole('combobox', { name: 'Country' });
    await userEvent.type(box, 'united');
    expect(box).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'United Arab Emirates',
      'United Kingdom',
      'United States',
    ]);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(spy).toHaveBeenCalledWith('United Kingdom');
    expect(box).toHaveValue('United Kingdom');
    expect(box).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the flag of the chosen country and picks with a click', async () => {
    const { container } = render(<Harness initial="India" />);
    expect(container.querySelector('img[src="/flags/in.svg"]')).not.toBeNull();
    const box = screen.getByRole('combobox', { name: 'Country' });
    await userEvent.click(box);
    expect(screen.getByRole('option', { name: 'India' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'Germany' }));
    expect(box).toHaveValue('Germany');
  });

  it('Escape or leaving keeps the previous country', async () => {
    render(<Harness initial="India" />);
    const box = screen.getByRole('combobox', { name: 'Country' });
    await userEvent.type(box, 'Fra');
    await userEvent.keyboard('{Escape}');
    expect(box).toHaveValue('India');
    await userEvent.type(box, 'Fra');
    await userEvent.tab();
    expect(box).toHaveValue('India');
  });

  it('says when nothing matches', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Country' }), 'zzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('No country matches “zzz”')).toBeInTheDocument();
  });
});
