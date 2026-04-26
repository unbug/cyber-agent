/**
 * LanguageToggle — Switch between English and Chinese.
 */

import { useI18n } from '@/i18n'
import styles from './LanguageToggle.module.css'

export function LanguageToggle() {
  const { locale, setLocale, supportedLocales } = useI18n()

  if (supportedLocales.length <= 1) return null

  const next = locale === 'en' ? 'zh' : 'en'

  return (
    <button
      className={styles.toggle}
      onClick={() => setLocale(next)}
      title={`Switch to ${next === 'en' ? 'English' : '中文'}`}
      aria-label={`Switch language to ${next === 'en' ? 'English' : 'Chinese'}`}
    >
      {locale === 'en' ? 'EN' : '中'}
    </button>
  )
}
