/**
 * Original abstract "project milestone path" illustration (spec §4:
 * multi-element SVG composition — background shape, thematic elements,
 * ProGuidance-palette accent). Decorative only.
 */
export function MilestonePathGraphic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 160"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="mp-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3F4A4D" />
          <stop offset="100%" stopColor="#273236" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="344" height="136" rx="16" fill="url(#mp-panel)" />
      <path
        d="M20 130 C 90 130, 90 60, 160 60 S 250 110, 340 40"
        fill="none"
        stroke="#FF4B00"
        strokeOpacity="0.25"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M20 130 C 90 130, 90 60, 160 60 S 250 110, 340 40"
        fill="none"
        stroke="#FF4B00"
        strokeWidth="3"
        strokeDasharray="1 10"
        strokeLinecap="round"
      />
      <g>
        <circle cx="20" cy="130" r="8" fill="#FF4B00" />
        <circle cx="20" cy="130" r="3.5" fill="#FFFFFF" />
        <circle cx="160" cy="60" r="8" fill="#F6F7F9" />
        <circle cx="160" cy="60" r="3.5" fill="#3F4A4D" />
        <circle cx="252" cy="92" r="8" fill="#F6F7F9" opacity="0.6" />
        <circle cx="340" cy="40" r="10" fill="none" stroke="#FF4B00" strokeWidth="2.5" strokeDasharray="4 4" />
      </g>
      <g transform="translate(330 12)">
        <path d="M10 28 V8 l14 5 -14 5" fill="#FF4B00" />
      </g>
      <rect x="36" y="34" width="64" height="8" rx="4" fill="#F6F7F9" opacity="0.25" />
      <rect x="36" y="48" width="40" height="6" rx="3" fill="#F6F7F9" opacity="0.15" />
    </svg>
  );
}
