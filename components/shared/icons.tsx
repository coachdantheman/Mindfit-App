import { useId } from 'react'

// Streak flame stays in full fire color, unlike the line icons below
export function FlameIcon({ className = 'w-4 h-4' }: { className?: string }) {
  const id = useId()
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}o`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" style={{ stopColor: 'var(--flame-mid)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--flame-edge)' }} />
        </linearGradient>
      </defs>
      <path fill={`url(#${id}o)`} d="M12 22c4 0 7-2.8 7-7 0-3.5-2.2-5.6-3.6-7.6-.4 1.6-1.4 2.8-2.4 3.1.3-3.2-1.1-6.3-4-8.5.3 3-1.4 5-3 6.9C4.8 10.4 5 12.6 5 15c0 4.2 3 7 7 7z" />
      <path style={{ fill: 'var(--flame-core)' }} d="M12 22c-1.7 0-3-1.3-3-3 0-1.8 1.4-2.8 2-4.4.9.7 1.6 1.4 2.2 2.4.4-.4.7-.9.8-1.5.9 1 1 2 1 3.5 0 1.7-1.3 3-3 3z" />
    </svg>
  )
}

// Line icons — stroke 1.75, round, currentColor (matches Navbar)

export function MedalIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2l3 6M16 2l-3 6" />
      <circle cx="12" cy="15" r="6" />
      <path d="M12 12.5l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z" />
    </svg>
  )
}

type P = { className?: string }
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export function TrophyIcon({ className = 'w-4 h-4' }: P) {
  return (
    <svg className={className} {...base}>
      <path d="M8 4h8v5a4 4 0 01-8 0V4z" />
      <path d="M8 6H5a1 1 0 00-1 1 4 4 0 004 4M16 6h3a1 1 0 011 1 4 4 0 01-4 4" />
      <path d="M12 13v4M9 21h6M10 17h4l1 4H9l1-4z" />
    </svg>
  )
}
export function CameraIcon({ className = 'w-4 h-4' }: P) {
  return (
    <svg className={className} {...base}>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
export function DumbbellIcon({ className = 'w-6 h-6' }: P) {
  return (
    <svg className={className} {...base}>
      <path d="M6 9v6M18 9v6M3 11v2M21 11v2M8 12h8" />
    </svg>
  )
}
export function BoltIcon({ className = 'w-6 h-6' }: P) {
  return (
    <svg className={className} {...base}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  )
}
export function BurstIcon({ className = 'w-6 h-6' }: P) {
  return (
    <svg className={className} {...base}>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
export function StretchIcon({ className = 'w-6 h-6' }: P) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="4.5" r="1.5" />
      <path d="M12 7v6M5 9l7 2 7-2M12 13l-4 7M12 13l4 7" />
    </svg>
  )
}
export function BodyweightIcon({ className = 'w-6 h-6' }: P) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="4.5" r="1.5" />
      <path d="M5 5l7 3 7-3M12 8v6M12 14l-3 7M12 14l3 7" />
    </svg>
  )
}
export function BalanceIcon({ className = 'w-6 h-6' }: P) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3v18M8 21h8M5 7h14" />
      <path d="M5 7l-3 6a3 3 0 006 0zM19 7l-3 6a3 3 0 006 0z" />
    </svg>
  )
}
