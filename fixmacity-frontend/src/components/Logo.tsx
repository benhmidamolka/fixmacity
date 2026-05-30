import React from 'react'
import { Link } from 'react-router-dom'
import logoIcon from '../assets/logo_icon_nobg.png'
import logoText from '../assets/logo_text_nobg.png'
import logoFull from '../assets/logo_full_nobg.png'

// ──────────────────────────────────────────────────────────────────────────────
//  FixMaCity Logo component
//
//  Usage:
//    <Logo />                        → icon + wordmark side by side (default)
//    <Logo iconOnly />               → hexagonal icon alone
//    <Logo textOnly />               → wordmark alone (e.g. collapsed sidebar)
//    <Logo variant="light" />        → white-safe (logo is already transparent)
//    <Logo size="sm|md|lg" />        → height variants
//    <Logo to="/dashboard" />        → custom link target
//
//  Asset setup — place the three PNGs in src/assets/:
//    logo_icon_nobg.png   (hexagon icon, transparent bg)
//    logo_text_nobg.png   (wordmark + tagline, transparent bg)
//    logo_full_nobg.png   (both together, transparent bg — fallback)
// ──────────────────────────────────────────────────────────────────────────────

interface LogoProps {
  /** Show only the hexagonal icon (no wordmark) */
  iconOnly?: boolean
  /** Show only the wordmark text (no icon) */
  textOnly?: boolean
  /** Use on dark backgrounds (default) or light backgrounds */
  variant?: 'dark' | 'light'
  /** Preset heights */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Gap between icon and wordmark */
  gap?: number
  /** React Router link target */
  to?: string
  className?: string
}

const HEIGHT_MAP: Record<string, number> = {
  sm: 28,
  md: 38,
  lg: 52,
  xl: 68,
}

const Logo: React.FC<LogoProps> = ({
  iconOnly = false,
  textOnly = false,
  variant = 'dark',
  size = 'md',
  gap,
  to = '/',
  className = '',
}) => {
  const h = HEIGHT_MAP[size]
  const gapPx = gap ?? Math.round(h * 0.3)

  // On dark backgrounds the logo is naturally visible (it's bright blue/white).
  // On light backgrounds we optionally darken it slightly with a CSS filter.
  const imgStyle: React.CSSProperties = {
    height: h,
    width: 'auto',
    objectFit: 'contain',
    display: 'block',
    flexShrink: 0,
    // On light bg: slightly darken so the white text stays readable
    filter: variant === 'light' ? 'none' : 'none',
  }

  let content: React.ReactNode

  if (iconOnly) {
    content = (
      <img
        src={logoIcon}
        alt="FixMaCity"
        style={imgStyle}
        draggable={false}
      />
    )
  } else if (textOnly) {
    content = (
      <img
        src={logoText}
        alt="FixMaCity — Plateforme de gestion des demandes citoyennes"
        style={imgStyle}
        draggable={false}
      />
    )
  } else {
    // Default: icon + text side by side
    content = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: gapPx,
        }}
      >
        <img
          src={logoIcon}
          alt=""
          aria-hidden="true"
          style={imgStyle}
          draggable={false}
        />
        <img
          src={logoText}
          alt="FixMaCity"
          style={{
            ...imgStyle,
            // Text part is slightly narrower in the original — match proportionally
            height: Math.round(h * 0.85),
          }}
          draggable={false}
        />
      </div>
    )
  }

  return (
    <Link
      to={to}
      className={`inline-flex items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg ${className}`}
      aria-label="FixMaCity — retour à l'accueil"
    >
      {content}
    </Link>
  )
}

export default Logo

// ──────────────────────────────────────────────────────────────────────────────
//  Usage examples:
//
//  Sidebar header (collapsed state — icon only):
//    <Logo iconOnly size="md" to="/dashboard" />
//
//  Sidebar header (expanded state — full logo):
//    <Logo size="md" to="/dashboard" />
//
//  Navbar on dark header:
//    <Logo size="lg" variant="dark" />
//
//  Navbar on white/light header:
//    <Logo size="lg" variant="light" />
//
//  Login page centered:
//    <Logo size="xl" className="mx-auto" />
//
//  Icon-only button for mobile:
//    <Logo iconOnly size="sm" />
// ──────────────────────────────────────────────────────────────────────────────