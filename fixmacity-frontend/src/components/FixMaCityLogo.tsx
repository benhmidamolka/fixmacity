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

/** Precise inline SVG recreation of the official Sousse municipal pin + wrench + skyline logo. */
const FixMaCityLogo: React.FC<FixMaCityLogoProps> = ({
  variant = 'dark',
  size = 'md',
  iconOnly = false,
  to = '/',
  className = '',
}) => {
  const { iconSize, fontSize, gap } = CONFIG[size]
  const isLight = variant === 'light'
  
  // Color configuration matching the uploaded design
  const pinColor = isLight ? '#FFFFFF' : '#03182E' // Dark blue or White
  const skylineColor = '#00A3E0' // Bright azure/sky blue from the logo
  const textColor = isLight ? '#FFFFFF' : '#03182E'
  const accentColor = '#00A3E0' // Azure brand accent to match the skyline

  // Generate unique IDs for SVG mask/clipPath to prevent rendering collisions when multiple logos are active
  const uniqueId = React.useId().replace(/:/g, '')
  const maskId = `pinMask-${uniqueId}`
  const clipId = `skylineClip-${uniqueId}`

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
        {/* Clip skyline to the inner circle */}
        <clipPath id={clipId}>
          <circle cx="50" cy="48" r="26" />
        </clipPath>

        {/* Mask to cut out the inner circle and the wrench jaw */}
        <mask id={maskId}>
          {/* Keep everything by default */}
          <rect x="0" y="0" width="100" height="110" fill="#FFFFFF" />
          {/* Cut out the inner circle */}
          <circle cx="50" cy="48" r="26" fill="#000000" />
          {/* Cut out the wrench jaw slot (angled at -40 degrees) */}
          <g transform="translate(68, 30) rotate(-40)">
            <rect x="-4" y="-18" width="8" height="18" rx="2.5" fill="#000000" />
            <circle cx="0" cy="0" r="4.5" fill="#000000" />
          </g>
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
            M 15 75 
            L 15 56 L 24 56 L 24 51 L 28 51 L 28 56 L 32 56 L 32 51 L 36 51 L 36 56 L 40 56 L 40 51 L 44 51 L 44 56 
            L 47 56 L 47 32 A 3 3 0 0 1 53 32 L 53 56 
            L 56 56 L 56 50 L 62 50 L 62 56 
            L 64 56 L 64 44 L 69 44 L 69 56 
            L 71 56 L 71 52 L 76 52 L 76 75 
            Z
          "
          fill={skylineColor}
        />
        {/* Spire on clock tower */}
        <line x1="50" y1="29" x2="50" y2="20" stroke={skylineColor} strokeWidth="1.5" />
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
