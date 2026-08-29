/**
 * Abstract logistics-route visual for the sign-in page's brand panel
 * (docs/design-system.md §10). Deliberately abstract — route lines and
 * delivery nodes on a dark graphite ground — not a literal map or any
 * stereotypical imagery, per the brief's instruction to avoid a
 * stereotypical "African-themed" interface while still reading as
 * operational/logistics in nature.
 */
export function AuthVisual() {
  return (
    <svg viewBox="0 0 480 640" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="auth-glow" cx="30%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#3C4F29" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#161C19" stopOpacity="0" />
        </radialGradient>
        <pattern id="auth-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#2B342F" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="480" height="640" fill="#161C19" />
      <rect width="480" height="640" fill="url(#auth-grid)" />
      <rect width="480" height="640" fill="url(#auth-glow)" />

      {/* Route lines */}
      <polyline points="40,540 140,460 150,320 260,260 300,140 400,90" fill="none" stroke="#8FAC69" strokeWidth="1.5" strokeDasharray="1 7" strokeLinecap="round" opacity="0.7" />
      <polyline points="60,610 180,560 220,420 190,300 280,220 260,110" fill="none" stroke="#3E9BA0" strokeWidth="1.5" strokeDasharray="1 7" strokeLinecap="round" opacity="0.55" />
      <polyline points="20,300 120,280 200,180 340,170 380,60" fill="none" stroke="#D99A1E" strokeWidth="1.2" strokeDasharray="1 6" strokeLinecap="round" opacity="0.4" />

      {/* Delivery nodes */}
      {[
        [140, 460, "#8FAC69"],
        [260, 260, "#8FAC69"],
        [400, 90, "#EFCC80"],
        [220, 420, "#3E9BA0"],
        [280, 220, "#3E9BA0"],
        [200, 180, "#D99A1E"],
      ].map(([cx, cy, color], i) => (
        <g key={i}>
          <circle cx={cx as number} cy={cy as number} r="10" fill={color as string} opacity="0.15" />
          <circle cx={cx as number} cy={cy as number} r="3.2" fill={color as string} />
        </g>
      ))}
    </svg>
  );
}
