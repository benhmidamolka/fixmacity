import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const LANGS = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',  flag: '🇹🇳' },
]

interface Props {
  /** visual variant — 'default' shows full label, 'compact' shows flag only */
  variant?: 'default' | 'compact'
  /** extra Tailwind classes for the trigger button */
  className?: string
  dark?: boolean
}

const LanguageSwitcher: React.FC<Props> = ({
  variant = 'default',
  className = '',
  dark = false,
}) => {
  const { i18n } = useTranslation()
  const [open, setOpen]   = useState(false)
  const ref               = useRef<HTMLDivElement>(null)
  const current           = LANGS.find(l => l.code === i18n.language) ?? LANGS[0]

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const select = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('fmc_lang', code)
    setOpen(false)
  }

  const btnBase = `
    flex items-center gap-1.5 rounded-xl border transition-all text-sm font-semibold
    ${dark
      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
      : 'bg-white border-slate-200 text-slate-600 hover:border-[#1557FF] hover:text-[#1557FF]'
    }
    ${variant === 'compact' ? 'px-2.5 py-2' : 'px-3 py-2'}
    ${className}
  `

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className={btnBase} aria-label="Select language">
        <Globe className="w-4 h-4 flex-shrink-0" />
        {variant !== 'compact' && (
          <span className="hidden sm:inline">{current.flag} {current.label}</span>
        )}
        {variant === 'compact' && <span>{current.flag}</span>}
      </button>

      {open && (
        <div
          className={`absolute z-[9999] top-[calc(100%+6px)] min-w-[140px] rounded-2xl shadow-xl border overflow-hidden
            ${document.documentElement.dir === 'rtl' ? 'left-0' : 'right-0'}
            ${dark
              ? 'bg-slate-900 border-slate-800'
              : 'bg-white border-slate-100'
            }
          `}
        >
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => select(lang.code)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors
                ${lang.code === i18n.language
                  ? dark
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-blue-50 text-[#1557FF] font-bold'
                  : dark
                    ? 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#1557FF]'
                }
              `}
            >
              <span className="text-base">{lang.flag}</span>
              <span className={lang.code === 'ar' ? 'font-arabic' : ''}>{lang.label}</span>
              {lang.code === i18n.language && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageSwitcher
