import React from 'react'
import { Link } from 'react-router-dom'

interface FixMaCityLogoProps {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  iconOnly?: boolean
  to?: string
  className?: string
}

const CONFIG = {
  sm: { iconSize: 30, fontSize: 15, gap: 8 },
  md: { iconSize: 40, fontSize: 20, gap: 11 },
  lg: { iconSize: 56, fontSize: 27, gap: 14 },
}

/** Exact recreation of the uploaded FixMaCity logo as inline SVG.
 *  Hexagonal frame · city skyline · location pin · wrench · leaves.
 *  Fully transparent background — clean SaaS sidebar style.
 */
const FixMaCityLogo: React.FC<FixMaCityLogoProps> = ({
  variant = 'dark',
  size = 'md',
  iconOnly = false,
  to = '/',
  className = '',
}) => {
  const { iconSize, fontSize, gap } = CONFIG[size]
  const isLight = variant === 'light'
  const textColor = isLight ? '#FFFFFF' : '#0A1628'
  const accentColor = '#1557FF'

  // SVG viewBox is 100x110 to give room for the full icon
  const svgIcon = (
    <svg
      width={iconSize}
      height={Math.round(iconSize * 1.1)}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <defs>
        {/* Main blue gradient matching the image */}
        <linearGradient id="blueGrad" x1="20" y1="10" x2="80" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A90D9" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        {/* Lighter blue for building highlights */}
        <linearGradient id="buildGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        {/* Accent gradient for pin */}
        <linearGradient id="pinGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        {/* Drop shadow filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ── HEXAGONAL OUTER FRAME ────────────────────────────── */}
      {/* Hexagon points for a flat-top hex centered at 50,54, r=46 */}
      <polygon
        points="50,8 91,31 91,77 50,100 9,77 9,31"
        fill="url(#blueGrad)"
        opacity="0.15"
      />
      <polygon
        points="50,8 91,31 91,77 50,100 9,77 9,31"
        fill="none"
        stroke="url(#blueGrad)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Inner hex ring */}
      <polygon
        points="50,13 87,33.5 87,74.5 50,95 13,74.5 13,33.5"
        fill="none"
        stroke="#3B82F6"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* ── CITY BUILDINGS ──────────────────────────────────── */}
      {/* Left short building */}
      <rect x="18" y="57" width="12" height="22" rx="1.5" fill="url(#blueGrad)" opacity="0.9" />
      <rect x="20" y="60" width="3" height="3" rx="0.5" fill="#93C5FD" opacity="0.8" />
      <rect x="25" y="60" width="3" height="3" rx="0.5" fill="#93C5FD" opacity="0.8" />
      <rect x="20" y="65" width="3" height="3" rx="0.5" fill="#93C5FD" opacity="0.8" />
      <rect x="25" y="65" width="3" height="3" rx="0.5" fill="#93C5FD" opacity="0.8" />
      <rect x="20" y="70" width="3" height="3" rx="0.5" fill="#93C5FD" opacity="0.8" />

      {/* Center-left building */}
      <rect x="31" y="48" width="13" height="31" rx="1.5" fill="url(#blueGrad)" />
      <rect x="33" y="51" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.9" />
      <rect x="38" y="51" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.9" />
      <rect x="33" y="57" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.9" />
      <rect x="38" y="57" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.9" />
      <rect x="33" y="63" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.9" />
      <rect x="38" y="63" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.9" />

      {/* Center tall building (flagship) */}
      <rect x="45" y="38" width="15" height="41" rx="1.5" fill="url(#blueGrad)" />
      {/* Antenna */}
      <rect x="51.5" y="30" width="2" height="9" rx="1" fill="#60A5FA" />
      {/* Windows on center building */}
      <rect x="47" y="42" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.95" />
      <rect x="53" y="42" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.95" />
      <rect x="47" y="49" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.95" />
      <rect x="53" y="49" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.95" />
      <rect x="47" y="56" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.95" />
      <rect x="53" y="56" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.95" />
      <rect x="47" y="63" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.95" />
      <rect x="53" y="63" width="4" height="4" rx="0.5" fill="#BFDBFE" opacity="0.95" />

      {/* Right-center building */}
      <rect x="61" y="52" width="12" height="27" rx="1.5" fill="url(#blueGrad)" opacity="0.9" />
      <rect x="63" y="55" width="3.5" height="3.5" rx="0.5" fill="#BFDBFE" opacity="0.85" />
      <rect x="68" y="55" width="3.5" height="3.5" rx="0.5" fill="#BFDBFE" opacity="0.85" />
      <rect x="63" y="61" width="3.5" height="3.5" rx="0.5" fill="#BFDBFE" opacity="0.85" />
      <rect x="68" y="61" width="3.5" height="3.5" rx="0.5" fill="#BFDBFE" opacity="0.85" />
      <rect x="63" y="67" width="3.5" height="3.5" rx="0.5" fill="#BFDBFE" opacity="0.85" />

      {/* Right short building */}
      <rect x="74" y="62" width="9" height="17" rx="1.5" fill="url(#blueGrad)" opacity="0.8" />
      <rect x="76" y="65" width="2.5" height="2.5" rx="0.5" fill="#93C5FD" opacity="0.7" />

      {/* Ground */}
      <rect x="15" y="78" width="70" height="1.5" rx="0.75" fill="#3B82F6" opacity="0.4" />

      {/* ── LOCATION PIN (on top of center building) ─────── */}
      {/* Pin body (teardrop) */}
      <path
        d="M52 14 C52 14 44 22 44 27 C44 31.4 47.6 35 52 35 C56.4 35 60 31.4 60 27 C60 22 52 14 52 14 Z"
        fill="url(#pinGrad)"
        filter="url(#glow)"
      />
      {/* Pin inner circle */}
      <circle cx="52" cy="27" r="4" fill="#1E3A8A" />
      <circle cx="52" cy="27" r="2" fill="#BFDBFE" opacity="0.8" />

      {/* ── LEAVES (bottom-left) ──────────────────────────── */}
      <path
        d="M14 82 C14 82 12 75 18 72 C22 70 26 72 26 72 C26 72 22 78 18 80 C16 81 14 82 14 82Z"
        fill="#22C55E"
        opacity="0.85"
      />
      <path
        d="M17 83 C17 83 13 78 16 72 C18 68 22 67 22 67 C22 67 21 74 19 78 C18 80 17 83 17 83Z"
        fill="#16A34A"
        opacity="0.75"
      />

      {/* ── WRENCH (bottom-right) ─────────────────────────── */}
      <g transform="translate(62, 75) rotate(-35)">
        {/* Wrench handle */}
        <rect x="2" y="0" width="5" height="16" rx="2.5" fill="#60A5FA" />
        {/* Wrench head open-end */}
        <path
          d="M0 -2 C0 -5 8 -5 8 -2 L8 2 C8 2 6 4 4 4 C2 4 0 2 0 2 Z"
          fill="#93C5FD"
        />
        <path
          d="M1.5 -1.5 C1.5 -1.5 6.5 -1.5 6.5 -1.5 L6.5 1 C6.5 1 4.5 2.5 3.5 2.5 C2.5 2.5 1.5 1 1.5 1 Z"
          fill="#1E3A8A"
        />
      </g>
    </svg>
  )

  if (iconOnly) {
    return (
      <Link to={to} className={`inline-flex items-center justify-center select-none ${className}`} aria-label="FixMaCity">
        {svgIcon}
      </Link>
    )
  }

  return (
    <Link
      to={to}
      className={`inline-flex items-center select-none ${className}`}
      style={{ gap }}
      aria-label="FixMaCity — accueil"
    >
      {svgIcon}
      <span
        style={{
          fontSize,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: textColor,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
        }}
      >
        Fix<span style={{ color: accentColor }}>Ma</span>City
      </span>
    </Link>
  )
}

export default FixMaCityLogo
