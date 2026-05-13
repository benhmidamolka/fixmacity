import React from 'react'
import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

interface LogoProps {
  variant?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  to?: string
  className?: string
}

const sizeMap = { sm: 'h-7', md: 'h-10', lg: 'h-14' }

const Logo: React.FC<LogoProps> = ({ variant = 'dark', size = 'md', to = '/', className = '' }) => {
  return (
    <Link to={to} className={`flex items-center gap-2 select-none ${className}`}>
      <img
        src={logoImg}
        alt="FixMaCity"
        className={`${sizeMap[size]} w-auto object-contain`}
        style={{ mixBlendMode: variant === 'light' ? 'normal' : 'multiply' }}
      />
      <div className="flex flex-col leading-none">
        <span className={`font-extrabold tracking-tight text-[20px] ${variant === 'light' ? 'text-white' : 'text-[#0A1628]'}`}>
          Fix<span style={{ color: '#1557FF' }}>Ma</span>City
        </span>
        <span className={`text-[8px] font-bold uppercase tracking-[0.25em] opacity-50 mt-0.5 ${variant === 'light' ? 'text-white' : 'text-[#0A1628]'}`}>
          Sousse Municipal
        </span>
      </div>
    </Link>
  )
}

export default Logo
