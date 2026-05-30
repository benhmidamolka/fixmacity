import React from 'react'
import FixMaCityLogo from './FixMaCityLogo'

interface LogoProps {
  /** Size mapping: xs/sm -> sm, md -> md, lg/xl/hero -> lg */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero'
  /** Show icon only (no wordmark) — for collapsed sidebar */
  iconOnly?: boolean
  /** 
   * 'dark'  — renders dark text (for light/white backgrounds)
   * 'light' — renders white text (for dark backgrounds)
   * 'auto'  — defaults to dark
   */
  variant?: 'dark' | 'light' | 'auto'
  to?: string
  className?: string
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  iconOnly = false,
  variant = 'auto',
  to = '/',
  className = '',
}) => {
  // Map sizes to FixMaCityLogo size options
  let mappedSize: 'sm' | 'md' | 'lg' = 'md'
  if (size === 'xs' || size === 'sm') {
    mappedSize = 'sm'
  } else if (size === 'md') {
    mappedSize = 'md'
  } else {
    mappedSize = 'lg'
  }

  // Map variants to FixMaCityLogo variant options
  // 'dark' = dark text for light backgrounds, 'light' = white text for dark backgrounds
  let mappedVariant: 'dark' | 'light' = 'dark'
  if (variant === 'light') {
    mappedVariant = 'light'
  } else if (variant === 'dark') {
    mappedVariant = 'dark'
  } else {
    mappedVariant = 'dark'
  }

  return (
    <FixMaCityLogo
      size={mappedSize}
      iconOnly={iconOnly}
      variant={mappedVariant}
      to={to}
      className={className}
    />
  )
}

export default Logo