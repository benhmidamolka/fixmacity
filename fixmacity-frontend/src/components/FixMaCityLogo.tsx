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
  sm: { iconSize: 32, fontSize: 16, gap: 8 },
  md: { iconSize: 42, fontSize: 20, gap: 10 },
  lg: { iconSize: 56, fontSize: 27, gap: 14 },
}

/** High-fidelity vector recreation of the official Sousse municipal pin + wrench + skyline logo. */
const FixMaCityLogo: React.FC<FixMaCityLogoProps> = ({
  variant = 'dark',
  size = 'md',
  iconOnly = false,
  to = '/',
  className = '',
}) => {
  const { iconSize, fontSize, gap } = CONFIG[size]
  const isLight = variant === 'light'
  
  // Color configuration matching the theme colors
  const pinColor = isLight ? '#FFFFFF' : '#0A1628' // Theme primary navy or White
  const skylineColor = '#1557FF' // Theme secondary blue
  const textColor = isLight ? '#FFFFFF' : '#0A1628'
  const accentColor = '#1557FF' // Theme secondary blue

  // Generate unique IDs for SVG mask/clipPath to prevent rendering collisions
  const uniqueId = React.useId().replace(/:/g, '')
  const maskId = `pinMask-${uniqueId}`
  const clipId = `skylineClip-${uniqueId}`
  const skylineMaskId = `skylineMask-${uniqueId}`

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
        {/* Clip skyline to the inner circle (radius 22.5 to leave a perfect gap/border) */}
        <clipPath id={clipId}>
          <circle cx="50" cy="48" r="22.5" />
        </clipPath>

        {/* Mask to cut out the inner circle and the wrench jaw from the pin */}
        <mask id={maskId}>
          {/* Keep everything by default */}
          <rect x="0" y="0" width="100" height="110" fill="#FFFFFF" />
          {/* Cut out the inner circle (radius 26 for the outer edge of the gap) */}
          <circle cx="50" cy="48" r="26" fill="#000000" />
          {/* Cut out the wrench jaw slot (angled at -40 degrees) */}
          <g transform="translate(68, 30) rotate(-40)">
            <rect x="-4.5" y="-18" width="9" height="18" rx="1.5" fill="#000000" />
            <circle cx="0" cy="0" r="5" fill="#000000" />
          </g>
        </mask>

        {/* Mask to cut windows out of the blue skyline buildings */}
        <mask id={skylineMaskId}>
          <rect x="0" y="0" width="100" height="110" fill="#FFFFFF" />
          {/* Window in the main clock tower */}
          <rect x="48.5" y="32" width="3" height="9" rx="1.5" fill="#000000" />
          {/* Windows in the rightmost building */}
          <rect x="73.5" y="58" width="1.5" height="4.5" rx="0.5" fill="#000000" />
          <rect x="76" y="60.5" width="1.5" height="4.5" rx="0.5" fill="#000000" />
        </mask>
      </defs>

      {/* ── Outer Pin & Wrench head ── */}
      <g mask={`url(#${maskId})`}>
        {/* Teardrop Pin body */}
        <path
          d="M 50 92 C 24 78 14 63 14 48 A 36 36 0 1 1 86 48 C 86 63 76 78 50 92 Z"
          fill={pinColor}
        />
        {/* Wrench head circle outer layer */}
        <circle cx="68" cy="30" r="13.5" fill={pinColor} />
      </g>

      {/* ── Inner City Skyline (Clipped) ── */}
      <g clipPath={`url(#${clipId})`}>
        {/* Sousse Ribat, Tower and Skyline Path */}
        <path
          d="
            M 10 80
            L 10 56
            L 20 56 L 20 50 L 23 50 L 23 56
            L 25 56 L 25 50 L 28 50 L 28 56
            L 30 56 L 30 50 L 33 50 L 33 56
            L 35 56 L 35 50 L 38 50 L 38 56
            L 42 56 L 42 60 L 45 60
            L 45 35 L 47 35 L 47 28 L 46 28 L 46 26 L 54 26 L 54 28 L 53 28 L 53 35 L 55 35
            L 55 60 L 58 60 L 58 52 L 64 52 L 64 60
            L 64 48 L 72 48 L 72 60
            L 72 54 L 79 54 L 79 80
            Z
          "
          fill={skylineColor}
          mask={`url(#${skylineMaskId})`}
        />
        {/* Dome on clock tower */}
        <path
          d="M 47 26 A 3 3 0 0 1 53 26 Z"
          fill={skylineColor}
        />
        {/* Spire on clock tower */}
        <line x1="50" y1="23" x2="50" y2="15" stroke={skylineColor} strokeWidth="1.5" strokeLinecap="round" />
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
          fontWeight: 900,
          letterSpacing: '-0.02em',
          color: textColor,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
          textTransform: 'uppercase'
        }}
      >
        FIX<span style={{ color: accentColor }}>MA</span>CITY
      </span>
    </Link>
  )
}

export default FixMaCityLogo
