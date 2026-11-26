// Inline flag icons for the language switch (no external assets needed).
export function FlagVN() {
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true" focusable="false">
      <rect width="30" height="20" fill="#da251d" />
      <polygon fill="#ffff00" points="15,4 16.76,9.42 22.46,9.42 17.85,12.77 19.61,18.19 15,14.84 10.39,18.19 12.15,12.77 7.54,9.42 13.24,9.42" />
    </svg>
  );
}

// English is represented by the United Kingdom flag.
export function FlagEN() {
  return (
    <svg viewBox="0 0 60 40" aria-hidden="true" focusable="false">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 60,40 M60,0 0,40" stroke="#fff" strokeWidth="8" />
      <path d="M0,0 60,40 M60,0 0,40" stroke="#c8102e" strokeWidth="3" />
      <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" stroke="#c8102e" strokeWidth="8" />
    </svg>
  );
}
