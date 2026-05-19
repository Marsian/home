import { cn } from '@/lib/utils'

export function StarTripThumbnail({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label="a star trip"
    >
      <defs>
        <linearGradient id="star-trip-sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#244f61" />
          <stop offset="0.62" stopColor="#132d3a" />
          <stop offset="1" stopColor="#2e213d" />
        </linearGradient>
        <radialGradient id="star-trip-planet" cx="42%" cy="34%" r="72%">
          <stop offset="0" stopColor="#a7e0a8" />
          <stop offset="0.58" stopColor="#63b985" />
          <stop offset="1" stopColor="#327464" />
        </radialGradient>
      </defs>
      <rect width="160" height="160" fill="url(#star-trip-sky)" />
      <circle cx="29" cy="26" r="2" fill="#fff3c7" opacity="0.9" />
      <circle cx="126" cy="35" r="1.6" fill="#fff3c7" opacity="0.75" />
      <circle cx="133" cy="113" r="1.4" fill="#fff3c7" opacity="0.65" />
      <circle cx="80" cy="86" r="44" fill="url(#star-trip-planet)" />
      <ellipse cx="65" cy="79" rx="15" ry="8" fill="#69a6c6" transform="rotate(-20 65 79)" />
      <ellipse cx="95" cy="63" rx="11" ry="6" fill="#c59a63" transform="rotate(18 95 63)" />
      <path d="M45 99c18-20 43-25 70-15" fill="none" stroke="#e9c88d" strokeWidth="5" strokeLinecap="round" opacity="0.82" />
      <g transform="translate(108 44) rotate(-12)">
        <rect x="-3" y="-2" width="6" height="25" rx="2" fill="#e9d7a9" />
        <path d="M2 2l18-7-5 14z" fill="#8ec7d2" />
        <circle cx="0" cy="-6" r="4" fill="#ffd95f" />
      </g>
      <g transform="translate(52 111) rotate(-22)">
        <ellipse cx="0" cy="0" rx="17" ry="7" fill="#5f4b3c" opacity="0.55" />
        <rect x="-16" y="-5" width="29" height="10" rx="5" fill="#f3e7cf" />
        <path d="M14-6l11 6-11 6z" fill="#e55d55" />
        <rect x="-18" y="4" width="7" height="8" rx="1" fill="#4f7f98" />
      </g>
      <g fill="#226b56">
        <path d="M47 57l6-14 7 14z" />
        <path d="M113 88l6-14 7 14z" />
        <path d="M70 116l6-13 7 13z" />
      </g>
      <g fill="#ffd95f">
        <path d="M36 86l5-5 5 5-5 5z" />
        <path d="M102 98l4-4 4 4-4 4z" />
      </g>
      <g transform="translate(70 50)">
        <circle cx="0" cy="8" r="7" fill="#f0b35d" />
        <circle cx="1" cy="1" r="6" fill="#ffd19a" />
        <path d="M-4-2l-3-7 7 3z" fill="#ffc489" />
        <path d="M6-2l4-6 3 7z" fill="#ffc489" />
        <rect x="-7" y="6" width="12" height="3" rx="1.5" fill="#e55d55" />
        <rect x="-4" y="10" width="8" height="8" rx="2" fill="#567a96" />
      </g>
      <ellipse cx="80" cy="86" rx="58" ry="18" fill="none" stroke="#ffe9ae" strokeWidth="2" opacity="0.42" transform="rotate(-18 80 86)" />
    </svg>
  )
}
