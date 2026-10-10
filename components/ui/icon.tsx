import type { SVGProps } from "react";

export type IconName =
  | "dashboard"
  | "batches"
  | "pigs"
  | "expenses"
  | "feed"
  | "sales"
  | "buyers"
  | "reports"
  | "settings"
  | "menu"
  | "chevron"
  | "trend"
  | "wallet"
  | "receipt"
  | "calendar"
  | "plus"
  | "arrow"
  | "close";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  batches: (
    <>
      <path d="M4 7h16v13H4z" />
      <path d="M8 7V4h8v3M8 12h8" />
    </>
  ),
  pigs: (
    <>
      <path d="M5 11c0-3.3 2.7-6 6-6h2a6 6 0 0 1 6 6v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4Z" />
      <path d="M5 10 2 8v6h3M19 10l3-2v6h-3M9 19v2M15 19v2" />
      <circle cx="9" cy="12" r=".7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r=".7" fill="currentColor" stroke="none" />
      <path d="M10 16h4" />
    </>
  ),
  expenses: (
    <>
      <path d="M4 3h16v18H4z" />
      <path d="M8 7h8M8 11h8M8 15h4" />
    </>
  ),
  feed: (
    <>
      <path d="M7 21c-1-5 0-10 5-15 5 5 6 10 5 15" />
      <path d="M12 6V3M9 11l3 2 3-2M8 16l4 2 4-2" />
    </>
  ),
  sales: (
    <>
      <circle cx="9" cy="20" r="1" />
      <circle cx="19" cy="20" r="1" />
      <path d="M3 4h2l2.5 11h11l2-7H7M10 8V5h8v3" />
    </>
  ),
  buyers: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M16 11a4 4 0 0 1 4 4v6" />
    </>
  ),
  reports: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  trend: <path d="m3 17 6-6 4 4 8-9M15 6h6v6" />,
  wallet: (
    <>
      <path d="M3 6h15a3 3 0 0 1 3 3v10H5a2 2 0 0 1-2-2V6Z" />
      <path d="M3 6a3 3 0 0 1 3-3h11v3M16 12h5" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2-3-2Z" />
      <path d="M9 9h6M9 13h6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
