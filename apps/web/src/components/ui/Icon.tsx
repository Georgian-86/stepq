import { iconSvg, type IconName } from '@stepq/brand';

export type { IconName };

/**
 * A Figma-exported icon (trusted build-time SVG string from @stepq/brand), rendered at its
 * exported size. Decorative unless `label` is given.
 */
export function Icon({
  name,
  label,
  className = '',
}: {
  name: IconName;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 ${className}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      dangerouslySetInnerHTML={{ __html: iconSvg[name] }}
    />
  );
}
