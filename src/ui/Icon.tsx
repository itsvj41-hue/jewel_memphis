import type { ReactNode } from 'react';

// One icon set: 24px grid, 1.9 stroke, round caps. Colour follows `currentColor`.
const PATHS: Record<string, ReactNode> = {
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  alert: <><path d="M12 8v5" /><path d="M12 16.5v.01" /><path d="M10.3 4.2L2.9 17.1A2 2 0 004.6 20h14.8a2 2 0 001.7-2.9L13.7 4.2a2 2 0 00-3.4 0z" /></>,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  backspace: <><path d="M21 6H9.5L3 12l6.5 6H21a1 1 0 001-1V7a1 1 0 00-1-1z" /><path d="M14 9.5l-4 5M10 9.5l4 5" /></>,
  camera: <><path d="M4 8.5A1.5 1.5 0 015.5 7H8l1.4-2h5.2L16 7h2.5A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z" /><circle cx="12" cy="13" r="3.4" /></>,
  ruler: <><path d="M3 16.5L16.5 3 21 7.5 7.5 21z" /><path d="M7 13l2 2M10 10l2 2M13 7l2 2" /></>,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      style={{ flex: 'none', display: 'block' }}
    >
      {PATHS[name]}
    </svg>
  );
}
