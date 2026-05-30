import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import fr from './locales/fr'
import en from './locales/en'
import ar from './locales/ar'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'ar'],
    detection: {
      // Order: localStorage → navigator → default
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'fmc_lang',
      cacheUserLanguage: true,
    } as any,
    interpolation: {
      escapeValue: false, // React already escapes
    },
  } as any)

// ── Apply RTL / LTR direction whenever language changes ─────────────────────
function applyDirection(lng: string) {
  const isRTL = lng === 'ar'
  document.documentElement.dir  = isRTL ? 'rtl' : 'ltr'
  document.documentElement.lang = lng
  // Add a helper class so CSS can target RTL-specific overrides
  document.documentElement.classList.toggle('rtl', isRTL)
}

applyDirection(i18n.language)
i18n.on('languageChanged', applyDirection)

export default i18n
