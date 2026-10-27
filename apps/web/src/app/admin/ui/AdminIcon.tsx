const PATHS = {
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  table: 'M3 5h18v14H3zM3 10h18M9 10v9',
  download: 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14',
  filter: 'M4 5h16l-6 7.5V19l-4-2v-4.5z',
  columns: 'M4 5h16v14H4zM9.5 5v14M14.5 5v14',
  search: 'm20 20-4.2-4.2M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0',
  close: 'M6 6l12 12M18 6 6 18',
  external: 'M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  chevron: 'm9 6 6 6-6 6',
  sortUp: 'M8 15l4-4 4 4',
  sortDown: 'M8 9l4 4 4-4',
  sort: 'M8 10l4-4 4 4M8 14l4 4 4-4',
  open: 'M15 3h6v6M21 3l-7 7M9 21H3v-6M3 21l7-7',
} as const;

export type AdminIconName = keyof typeof PATHS;

/** Line icons for the dashboard (24 px grid, 2 px stroke), decorative. */
export function AdminIcon({
  name,
  className = 'size-[18px]',
}: {
  name: AdminIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
