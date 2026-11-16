import { HeartbeatToFormLine } from './HeartbeatToFormLine';

export const BrandEmblem3D = ({
  size = 'md',
  layout = 'row',
  subtitle = 'JAN SEVA & CYBER CAFE FIRM',
  onClick,
}: {
  size?: 'sm' | 'md' | 'lg';
  layout?: 'row' | 'col';
  subtitle?: string;
  onClick?: () => void;
}) => {
  const isCol = layout === 'col';
  const logoBoxClass = size === 'sm' ? 'w-8 h-8 sm:w-10 sm:h-10' : size === 'md' ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-16 h-16 sm:w-20 sm:h-20';
  const fTextClass = size === 'sm' ? 'text-xl sm:text-2xl' : size === 'md' ? 'text-2xl sm:text-3xl' : 'text-4xl sm:text-5xl';
  const illupTextClass = size === 'sm' ? 'text-xs sm:text-sm' : size === 'md' ? 'text-sm sm:text-lg' : 'text-xl sm:text-2xl';
  const subtitleClass = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-xs' : 'text-[10px]';

  return (
    <div
      onClick={onClick}
      className={`flex ${isCol ? 'flex-col items-center text-center gap-3' : 'items-center gap-3'} ${onClick ? 'cursor-pointer' : ''} group select-none`}
    >
      <div className={`relative ${logoBoxClass} flex items-center justify-center group-hover:scale-105 transition-all duration-300 shrink-0`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/35 via-blue-500/25 to-indigo-600/35 rounded-2xl blur-md group-hover:blur-lg transition-all pointer-events-none" />
        <div className="relative w-full h-full rounded-2xl p-[1px] bg-gradient-to-b from-cyan-400/80 via-blue-500/50 to-indigo-600/70 shadow-xl shadow-cyan-500/15 group-hover:shadow-cyan-500/35 transition-all flex items-center justify-center overflow-hidden">
          <div className="w-full h-full bg-[#080D18]/95 backdrop-blur-md rounded-[15px] flex items-center justify-center p-1.5 relative overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
            <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_2px_10px_rgba(6,182,212,0.7)]">
              <defs>
                <linearGradient id="brand3dCompScreenLid" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#1e40af" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="brand3dCompScreenDisplay" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#051024" />
                </linearGradient>
                <linearGradient id="brand3dCompBaseDeck" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="50%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="brand3dCompBaseFront" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id="brand3dCompOrbit" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <ellipse cx="32" cy="55" rx="24" ry="3.5" fill="#000000" opacity="0.6" />
              <ellipse cx="32" cy="33" rx="28" ry="12" fill="none" stroke="url(#brand3dCompOrbit)" strokeWidth="1.4" strokeDasharray="3 2" transform="rotate(-18 32 33)" />
              <polygon points="16,34 48,34 56,48 8,48" fill="url(#brand3dCompBaseDeck)" />
              <line x1="8" y1="48" x2="56" y2="48" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
              <polygon points="8,48 56,48 56,52 8,52" fill="url(#brand3dCompBaseFront)" />
              <line x1="26" y1="50" x2="38" y2="50" stroke="#22d3ee" strokeWidth="1.2" strokeLinecap="round" filter="drop-shadow(0 0 3px #06b6d4)" />
              <polygon points="18,36 46,36 50,44 14,44" fill="#061224" stroke="#0284c7" strokeWidth="0.6" />
              <line x1="17" y1="38.5" x2="47" y2="38.5" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="2 1" opacity="0.8" />
              <line x1="16" y1="41" x2="48" y2="41" stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="2 1" opacity="0.8" />
              <line x1="15" y1="43" x2="49" y2="43" stroke="#67e8f9" strokeWidth="0.75" strokeDasharray="2.5 1" opacity="0.85" />
              <polygon points="27,45 37,45 38,47.5 26,47.5" fill="#0b172a" stroke="#38bdf8" strokeWidth="0.6" opacity="0.9" />
              <polygon points="17,9 47,9 48,34 16,34" fill="url(#brand3dCompScreenLid)" />
              <polygon points="16,9 17,9 16,34 15,34" fill="#0284c7" opacity="0.7" />
              <polygon points="18,11 46,11 47,33 17,33" fill="#020617" />
              <polygon points="20,13 44,13 45,31 19,31" fill="url(#brand3dCompScreenDisplay)" />
              <polygon points="20,13 32,13 22,31 19,31" fill="#ffffff" opacity="0.35" />
              <circle cx="32" cy="20" r="4.5" fill="none" stroke="#a5f3fc" strokeWidth="1" filter="drop-shadow(0 0 3px #38bdf8)" />
              <path d="M30 20 L31.5 21.5 L34 19" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="23" y1="27" x2="33" y2="27" stroke="#67e8f9" strokeWidth="1" opacity="0.8" />
              <line x1="23" y1="29.5" x2="29" y2="29.5" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
              <circle cx="41" cy="27" r="1.5" fill="#34d399" filter="drop-shadow(0 0 3px #10b981)" />
              <circle cx="9" cy="24" r="1.4" fill="#a5f3fc" filter="drop-shadow(0 0 3px #06b6d4)" />
              <circle cx="55" cy="42" r="1.4" fill="#38bdf8" filter="drop-shadow(0 0 3px #3b82f6)" />
              <circle cx="32" cy="7" r="1.4" fill="#c084fc" filter="drop-shadow(0 0 3px #a855f7)" />
            </svg>
          </div>
        </div>
      </div>

      <div className={`flex flex-col ${isCol ? 'items-center' : 'justify-center'}`}>
        <div className="font-black tracking-normal text-white font-['Poppins'] flex items-baseline group-hover:brightness-110 transition-all leading-none">
          <span className={`${fTextClass} font-serif italic font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.55)] pr-0.5 leading-none select-none`}>
            F
          </span>
          <span className={`${illupTextClass} font-black tracking-[0.22em] text-white self-center pb-0.5 font-['Poppins',sans-serif] brand-illup-text`}>
            ILLUP
          </span>
        </div>
        <div className="flex w-full items-center justify-center my-0.5 pointer-events-none">
          <HeartbeatToFormLine size={size === 'lg' ? 'md' : size === 'sm' ? 'sm' : 'sm'} />
        </div>
        {subtitle && (
          <p className={`${subtitleClass} hidden sm:block text-cyan-400/90 font-mono tracking-widest uppercase font-bold`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
