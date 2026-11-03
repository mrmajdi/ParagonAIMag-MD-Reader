import { useId } from 'react';

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const rawId = useId();
  const id = `paragon-logo-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Paragon AI MAG"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="8" y1="4" x2="56" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#149a8e" />
          <stop offset="0.55" stopColor="#0f766e" />
          <stop offset="1" stopColor="#084b47" />
        </linearGradient>
        <linearGradient id={`${id}-page`} x1="16" y1="22" x2="46" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9f4ee" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="17" fill={`url(#${id}-bg)`} />
      <path
        d="M14 21.4c6.4-2.3 12.6-.5 18 4.2v23.1c-5.4-4.7-11.6-6.5-18-4.2V21.4Z"
        fill={`url(#${id}-page)`}
      />
      <path
        d="M50 21.4c-6.4-2.3-12.6-.5-18 4.2v23.1c5.4-4.7 11.6-6.5 18-4.2V21.4Z"
        fill="#ffffff"
        opacity="0.78"
      />
      <path d="M32 25.6v23.1" stroke="#0a5d57" strokeOpacity="0.32" strokeWidth="1.4" />
      <path
        d="M18.5 27.2c3.2-.4 6.3.5 9.1 2.3M18.5 32.1c3.2-.4 6.3.5 9.1 2.3M18.5 37c3.2-.4 6.3.5 9.1 2.3"
        stroke="#0f766e"
        strokeOpacity="0.35"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="47.6" cy="16.8" r="2.6" fill="#f3c56a" />
      <path
        d="M47.6 11.6v2M47.6 20v2M42.4 16.8h2M50.8 16.8h2"
        stroke="#f3c56a"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
