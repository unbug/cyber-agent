/**
 * i18n — Lightweight internationalization for CyberAgent.
 *
 * Uses React Context + JSON message files. No external dependency.
 * Auto-detects language from browser locale, defaults to 'en'.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import enMessages from './locales/en.json'
import zhMessages from './locales/zh.json'

const messages: Record<string, unknown> = { en: enMessages, zh: zhMessages }

export type Locale = 'en' | 'zh'

export interface I18nContextValue {
  locale: Locale
  t: (key: string) => string
  setLocale: (locale: Locale) => void
  supportedLocales: Locale[]
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  t: (key: string) => key,
  setLocale: () => {},
  supportedLocales: ['en', 'zh'],
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Auto-detect from browser
    const browserLang = navigator.language?.toLowerCase() ?? ''
    if (browserLang.startsWith('zh')) return 'zh'
    return 'en'
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem('cyberagent-locale', l)
    } catch {
      // ignore
    }
  }, [])

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cyberagent-locale')
      if (saved === 'zh' || saved === 'en') {
        setLocaleState(saved)
      }
    } catch {
      // ignore
    }
  }, [])

  const t = useCallback(
    (key: string): string => {
      const msgs = messages[locale] as Record<string, unknown>
      const parts = key.split('.')
      let result: unknown = msgs
      for (const part of parts) {
        if (result && typeof result === 'object') {
          result = (result as Record<string, unknown>)[part]
        } else {
          return key
        }
      }
      return typeof result === 'string' ? result : key
    },
    [locale],
  )

  return (
    <I18nContext.Provider value={{ locale, t, setLocale, supportedLocales: ['en', 'zh'] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext)
}
