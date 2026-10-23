import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChipGroup } from './ChipGroup';

type G = 'female' | 'male' | 'non_binary';
const options: { value: G; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
];

function Harness({ initial, spy }: { initial?: G; spy?: (v: G) => void }) {
  const [value, setValue] = useState<G | undefined>(initial);
  return (
    <ChipGroup<G>
      label="Gender"
      options={options}
      value={value}
      onChange={(v) => {
        spy?.(v);
        setValue(v);
      }}
    />
  );
}

describe('ChipGroup', () => {
  it('is a labelled radiogroup with a roving tabindex', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Gender' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
  });

  it('ArrowRight moves selection and focus to the next chip, wrapping at the end', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Harness initial="female" spy={spy} />);
    const female = screen.getByRole('radio', { name: 'Female' });
    female.focus();
    await user.keyboard('{ArrowRight}');
    const male = screen.getByRole('radio', { name: 'Male' });
    expect(spy).toHaveBeenLastCalledWith('male');
    expect(male).toHaveAttribute('aria-checked', 'true');
    expect(male).toHaveFocus();
    expect(male.tabIndex).toBe(0);
    expect(female.tabIndex).toBe(-1);
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Female' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Non-binary' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('click selects; the error is announced and marks the group invalid', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ChipGroup
        label="Gender"
        options={options}
        value={undefined}
        onChange={onChange}
        error="Pick one"
      />,
    );
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAccessibleDescription('Pick one');
    expect(group).toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getByRole('radio', { name: 'Male' }));
    expect(onChange).toHaveBeenCalledWith('male');
  });
});
