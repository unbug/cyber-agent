/**
 * LanguageToggle — Switch between English and Chinese.
 */

import { useI18n } from '@/i18n'
import styles from './LanguageToggle.module.css'

export function LanguageToggle() {
  const { locale, setLocale, supportedLocales } = useI18n()

  if (supportedLocales.length <= 1) return null

  const next = locale === 'en' ? 'zh' : 'en'
  const label = next === 'en' ? 'EN' : '中文'

  return (
    <button
      className={styles.toggle}
      onClick={() => setLocale(next)}
      title={`Switch to ${next === 'en' ? 'English' : 'Chinese'}`}
      aria-label={`Switch language to ${next === 'en' ? 'English' : 'Chinese'}`}
    >
      <span className={styles.current}>{locale === 'en' ? 'EN' : '中文'}</span>
      <span className={styles.arrow}>→</span>
      <span className={styles.next}>{label}</span>
    </button>
  )
}
