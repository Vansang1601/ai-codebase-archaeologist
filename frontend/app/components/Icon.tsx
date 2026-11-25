import type { ReactNode } from "react";

const paths = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  upRight: <path d="M6 18 18 6M6 6h12v12" />,
  back: <path d="M20 12H5m6 6-6-6 6-6" />,
  repository: <><path d="M5 4h14v16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 1-2Zm-1 13a2 2 0 0 1 2-2h13"/><path d="M8 4v7l2-1.5 2 1.5V4"/></>,
  layers: <><path d="m2 8 10-5 10 5-10 5L2 8Zm0 4 10 5 10-5M2 16l10 5 10-5"/></>,
  graph: <><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8 11 7.5-4.5M8 13l7.5 4.5"/></>,
  file: <><path d="M5 3h9l5 5v13H5zM14 3v6h5"/><path d="M8 13h8m-8 4h5"/></>,
  quote: <><path d="M3 4h18v13H9l-5 4v-4H3z"/><path d="M7 8h10M7 12h6"/></>,
  code: <><path d="m7 8-4 4 4 4m10-8 4 4-4 4m-4-12-2 16"/></>,
  refresh: <><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/></>,
  branch: <><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="7" r="2"/><path d="M6 7v10m12-8c0 5-3 6-12 6"/></>,
  commit: <><circle cx="12" cy="12" r="4"/><path d="M2 12h6m8 0h6"/></>,
  audit: <><path d="M4 4h16v16H4zM8 14l3-4 3 3 3-5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
  overview: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18m-10 0v10"/></>,
  moon: <path d="M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  folder: <path d="M3 6h7l2 2h9v11H3z"/>,
  compass: <><circle cx="12" cy="12" r="9"/><path d="m15 8-2 5-5 3 2-6z"/></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  check: <polyline points="20 6 9 17 4 12"/>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  github: <path fill="currentColor" stroke="none" transform="scale(1.5)" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;
export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
