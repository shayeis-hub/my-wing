export const APP_STORE_URL = "https://apps.apple.com/app/id6802739488";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=app.wingpact.android";

export function AppleBadge() {
  return (
    <a
      href={APP_STORE_URL}
      className="inline-flex items-center gap-2.5 bg-wing-ink text-wing-bg rounded-2xl px-5 py-3 font-bold hover:opacity-90 transition-opacity"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.28.74 3.08.8.94-.16 1.84-.83 3.09-.9 1.44-.07 2.5.55 3.34 1.85-3.02 1.84-2.5 5.65.7 7.03-.5 1.5-1.15 2.99-2.21 4.19Zm-3.55-16.5C13.7 2.5 15.36 1.05 17 1c.32 1.72-1.34 3.37-2.5 4.28-1.24.94-2.8.32-3-.5Z" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-medium tracking-wider uppercase opacity-70">
          Download on the
        </span>
        <span className="block text-lg -mt-0.5">App Store</span>
      </span>
    </a>
  );
}

export function GooglePlayBadge() {
  return (
    <a
      href={PLAY_STORE_URL}
      className="inline-flex items-center gap-2.5 bg-wing-ink text-wing-bg rounded-2xl px-5 py-3 font-bold hover:opacity-90 transition-opacity"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.463 11.463 0 00-9.14 0L5.45 5.67a.637.637 0 00-.87-.2c-.28.16-.38.53-.22.83L6.2 9.48A10.81 10.81 0 001 18h22a10.81 10.81 0 00-5.4-8.52ZM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5Zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5Z" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-[10px] font-medium tracking-wider uppercase opacity-70">
          Get it on
        </span>
        <span className="block text-lg -mt-0.5">Google Play</span>
      </span>
    </a>
  );
}

export function WingLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.61} viewBox="0 0 72 44" fill="none">
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="72" y2="44">
          <stop offset="0" stopColor="#f5dd4b" />
          <stop offset="1" stopColor="#ff6b47" />
        </linearGradient>
      </defs>
      <path d="M4 38 L36 8 L68 38" stroke="url(#wg)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="36" cy="8" r="5.5" fill="#d4541a" />
      <circle cx="20" cy="23" r="3.5" fill="#1a1814" />
      <circle cx="52" cy="23" r="3.5" fill="#1a1814" />
    </svg>
  );
}

