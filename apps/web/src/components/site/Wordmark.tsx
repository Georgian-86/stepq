/** The StepQ wordmark (Figma `4:270`): Fredoka 600, tracking −3 %, "step" ink + "q" deep. */
export function Wordmark({
  size = 'nav',
  className = '',
}: {
  size?: 'nav' | 'footer';
  className?: string;
}) {
  return (
    <span
      className={`block font-display leading-[normal] font-semibold tracking-[-0.03em] whitespace-nowrap text-ink ${
        size === 'nav' ? 'text-[31.68px]' : 'text-[35.2px]'
      } ${className}`}
    >
      step<span className="text-deep">q</span>
    </span>
  );
}
