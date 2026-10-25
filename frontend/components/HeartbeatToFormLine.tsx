import React from 'react';

interface HeartbeatToFormLineProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBadge?: boolean;
}

/**
 * HeartbeatToFormLine:
 * A signature dynamic visual where the vital Heartbeat (ECG pulse line)
 * flows across and directly forms/draws a digital Application Form document,
 * symbolizing: "Digital vitality breathing life into every form filled!"
 */
export const HeartbeatToFormLine: React.FC<HeartbeatToFormLineProps> = ({
  size = 'md',
  className = '',
  showBadge = false,
}) => {
  // Dimension profiles
  const config = {
    sm: {
      width: 140,
      height: 22,
      viewBox: '0 0 160 26',
      strokeWidth: 1.6,
      badgeText: 'text-[8px]',
    },
    md: {
      width: 190,
      height: 28,
      viewBox: '0 0 200 30',
      strokeWidth: 2,
      badgeText: 'text-[9px]',
    },
    lg: {
      width: 320,
      height: 42,
      viewBox: '0 0 320 42',
      strokeWidth: 2.2,
      badgeText: 'text-[11px]',
    },
  }[size];

  // Unique IDs for SVG gradients to prevent DOM collisions
  const gradId = `hbFormGrad_${size}`;
  const glowId = `hbFormGlow_${size}`;
  const docFillId = `hbDocFill_${size}`;

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Ambient Underglow */}
        <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-full pointer-events-none" />

        {/* The Continuous SVG where the Heartbeat literally draws the Form */}
        <svg
          viewBox={config.viewBox}
          className="w-full h-auto overflow-visible drop-shadow-[0_0_8px_rgba(6,182,212,0.65)]"
          style={{ maxWidth: config.width }}
        >
          <defs>
            {/* High-voltage Cyan -> Sky -> Emerald linear gradient */}
            <linearGradient id={gradId} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="15%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="30%" stopColor="#38bdf8" stopOpacity="1" />
              <stop offset="48%" stopColor="#67e8f9" stopOpacity="1" />
              <stop offset="68%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="85%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
            </linearGradient>

            {/* Document sheet fill gradient with subtle 3D frosted glass depth */}
            <linearGradient id={docFillId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#081b33" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#051224" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020914" stopOpacity="0.95" />
            </linearGradient>

            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#22d3ee" floodOpacity="0.8" />
            </filter>
          </defs>

          {size === 'lg' ? (
            /* ================= LARGE VIEWPORT (HERO SHOWCASE) ================= */
            <g>
              {/* Baseline background track with subtle pulse shimmer */}
              <line x1="8" y1="21" x2="312" y2="21" stroke="#0e3052" strokeWidth="1" strokeDasharray="3 3" />

              {/* 1. Heartbeat Waveform Segment leading into the Form */}
              {/* Left baseline node */}
              <circle cx="12" cy="21" r="2.5" fill="#22d3ee" filter={`url(#${glowId})`} />

              {/* Heartbeat path that leads directly into the Form outline */}
              <path
                d="M 12 21 
                   L 45 21 
                   Q 52 17, 58 21 
                   L 66 21 
                   L 72 25 
                   L 80 5 
                   L 90 37 
                   L 98 21 
                   Q 106 14, 114 21 
                   L 126 21 
                   L 132 24 
                   L 138 12 
                   L 144 21 
                   C 152 21, 156 8, 166 8"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Glowing Pulse Energy Spark on Heartbeat Peak */}
              <circle cx="80" cy="5" r="3" fill="#ffffff" filter={`url(#${glowId})`} />
              <circle cx="80" cy="5" r="1.5" fill="#22d3ee" />

              {/* 2. The Form Document constructed by the heartbeat line */}
              {/* Form Document 3D Outline and Backing */}
              <g className="transform hover:scale-105 transition-transform duration-300">
                {/* Document Body (Drawn continuously from heartbeat at x=166, y=8) */}
                <path
                  d="M 166 8 
                     L 194 8 
                     L 204 18 
                     L 204 36 
                     L 166 36 
                     Z"
                  fill={`url(#${docFillId})`}
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  filter={`url(#${glowId})`}
                />

                {/* Form Corner Fold (Dog-ear) */}
                <path
                  d="M 194 8 L 194 18 L 204 18"
                  fill="#0e2a47"
                  stroke="#22d3ee"
                  strokeWidth="1.4"
                />

                {/* Ruled Form Fields / Lines (Simulating form data being filled) */}
                {/* Form Title bar */}
                <rect x="171" y="12" width="16" height="2" rx="1" fill="#38bdf8" opacity="0.9" />

                {/* Form Field Line 1 */}
                <line x1="171" y1="18" x2="190" y2="18" stroke="#67e8f9" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
                {/* Form Field Line 2 */}
                <line x1="171" y1="23" x2="198" y2="23" stroke="#93c5fd" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
                {/* Form Field Line 3 */}
                <line x1="171" y1="28" x2="186" y2="28" stroke="#67e8f9" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />

                {/* Verified / Completed Checkmark badge on the form */}
                <circle cx="196" cy="30" r="4.5" fill="#064e3b" stroke="#34d399" strokeWidth="1.2" />
                <path
                  d="M 194 30 L 195.5 31.5 L 198.5 28.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Stylus / Pen Tip drawing the form line */}
                <g transform="translate(187, 26) rotate(-35)">
                  <polygon points="0,0 2,-6 5,-6 3,0" fill="#38bdf8" />
                  <polygon points="0,0 3,0 1.5,2.5" fill="#34d399" />
                </g>
              </g>

              {/* 3. Output Line continuing from the Form to the right */}
              <path
                d="M 204 21 
                   L 220 21 
                   L 226 16 
                   L 232 26 
                   L 238 21 
                   L 308 21"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Right baseline node */}
              <circle cx="308" cy="21" r="2.5" fill="#34d399" filter={`url(#${glowId})`} />
            </g>
          ) : size === 'md' ? (
            /* ================= MEDIUM VIEWPORT (BRAND EMBLEM & HEADER) ================= */
            <g>
              {/* Baseline background */}
              <line x1="6" y1="15" x2="194" y2="15" stroke="#0e2a47" strokeWidth="0.8" strokeDasharray="2 2" />

              {/* Heartbeat pulse connecting directly into Form outline */}
              <circle cx="8" cy="15" r="2" fill="#22d3ee" />

              <path
                d="M 8 15 
                   L 32 15 
                   Q 37 12, 42 15 
                   L 48 15 
                   L 52 18 
                   L 58 4 
                   L 66 26 
                   L 72 15 
                   Q 78 10, 84 15 
                   L 94 15 
                   C 98 15, 102 5, 108 5"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Peak Pulse Spark */}
              <circle cx="58" cy="4" r="2" fill="#ffffff" filter={`url(#${glowId})`} />

              {/* The Form Document formed by the heartbeat */}
              <g>
                <path
                  d="M 108 5 
                     L 126 5 
                     L 134 13 
                     L 134 26 
                     L 108 26 
                     Z"
                  fill={`url(#${docFillId})`}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  filter={`url(#${glowId})`}
                />

                {/* Form fold */}
                <path d="M 126 5 L 126 13 L 134 13" fill="#0d243f" stroke="#22d3ee" strokeWidth="1" />

                {/* Ruled lines inside the Form */}
                <line x1="112" y1="10" x2="123" y2="10" stroke="#67e8f9" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="112" y1="15" x2="129" y2="15" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="112" y1="20" x2="124" y2="20" stroke="#67e8f9" strokeWidth="1.2" strokeLinecap="round" />

                {/* Completed Checkmark on Form */}
                <circle cx="128" cy="21" r="3.2" fill="#064e3b" stroke="#34d399" strokeWidth="1" />
                <path d="M 126.5 21 L 127.8 22.2 L 130 19.8" fill="none" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Line continues outward to right */}
              <path
                d="M 134 15 
                   L 146 15 
                   L 150 12 
                   L 154 18 
                   L 158 15 
                   L 192 15"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle cx="192" cy="15" r="2" fill="#34d399" />
            </g>
          ) : (
            /* ================= SMALL VIEWPORT (COMPACT NAVBAR / FOOTER) ================= */
            <g>
              <circle cx="6" cy="13" r="1.5" fill="#22d3ee" />

              {/* Heartbeat pulse directly into Form */}
              <path
                d="M 6 13 
                   L 25 13 
                   L 28 15 
                   L 33 3 
                   L 39 23 
                   L 44 13 
                   Q 49 9, 54 13 
                   L 62 13 
                   C 66 13, 69 4, 74 4"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle cx="33" cy="3" r="1.5" fill="#ffffff" />

              {/* The Form Document */}
              <g>
                <path
                  d="M 74 4 
                     L 89 4 
                     L 95 10 
                     L 95 22 
                     L 74 22 
                     Z"
                  fill={`url(#${docFillId})`}
                  stroke="#38bdf8"
                  strokeWidth="1.3"
                  filter={`url(#${glowId})`}
                />
                <path d="M 89 4 L 89 10 L 95 10" fill="#0d243f" stroke="#22d3ee" strokeWidth="0.8" />
                <line x1="77" y1="9" x2="86" y2="9" stroke="#67e8f9" strokeWidth="1" strokeLinecap="round" />
                <line x1="77" y1="13" x2="91" y2="13" stroke="#93c5fd" strokeWidth="1" strokeLinecap="round" />
                <line x1="77" y1="17" x2="85" y2="17" stroke="#34d399" strokeWidth="1" strokeLinecap="round" />
                {/* Mini checkmark */}
                <circle cx="90" cy="18" r="2.2" fill="#064e3b" stroke="#34d399" strokeWidth="0.8" />
                <path d="M 89 18 L 89.8 18.8 L 91.5 17" fill="none" stroke="#ffffff" strokeWidth="0.9" strokeLinecap="round" />
              </g>

              {/* Right continuation */}
              <path
                d="M 95 13 
                   L 106 13 
                   L 109 10 
                   L 112 16 
                   L 115 13 
                   L 154 13"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <circle cx="154" cy="13" r="1.5" fill="#34d399" />
            </g>
          )}
        </svg>
      </div>

      {showBadge && (
        <div className="flex items-center gap-1.5 mt-1 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className={`${config.badgeText} font-mono font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-emerald-300`}>
            Heartbeat → Digital Form Active
          </span>
        </div>
      )}
    </div>
  );
};

export default HeartbeatToFormLine;
