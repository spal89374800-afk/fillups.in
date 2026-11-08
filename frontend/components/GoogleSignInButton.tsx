import { useEffect, useRef, useState } from 'react';
import { renderGoogleButton } from '../services/googleAuth';

// ========================================================
// 🔐 "CONTINUE WITH GOOGLE" BUTTON (additional login option)
// ========================================================
// Ye component OTP button ke NEECHE, ek "or" divider ke baad render hota hai.
// Google configured na ho to kuch bhi render nahi hota (OTP flow untouched).
export function GoogleSignInButton({
  onCredential,
  disabled = false
}: {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [status, setStatus] = useState<'loading' | 'ready' | 'hidden'>('loading');

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let cancelled = false;
    void renderGoogleButton(element, credential => callbackRef.current(credential)).then(ok => {
      if (cancelled) return;
      setStatus(ok ? 'ready' : 'hidden');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'hidden') return null;

  return (
    <div className="pt-1">
      <div className="flex items-center gap-3 py-1" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="relative w-full flex justify-center min-h-[44px]">
        {status === 'loading' && (
          <div className="absolute inset-0 rounded-xl bg-white/[0.06] animate-pulse" />
        )}
        <div
          ref={containerRef}
          className={`w-full flex justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        />
      </div>
      <p className="mt-1.5 text-center text-[10px] leading-snug text-slate-500">
        Google verifies your Gmail only. Mobile number and address details are still required.
      </p>
    </div>
  );
}
