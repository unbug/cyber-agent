import { useState } from 'react'
import { useOutlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, BookOpen, Grid3X3, Star, ShoppingBag, Github, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { useI18n } from '@/i18n'
import { LanguageToggle } from './LanguageToggle'
import styles from './Layout.module.css'

/** Freeze outlet so exit animation keeps old content */
function FrozenOutlet() {
  const o = useOutlet()
  const [outlet] = useState(o)
  return outlet
}

const NAV_ITEMS = [
  { path: '/', label: 'nav.home', icon: Bot },
  { path: '/marketplace', label: 'nav.marketplace', icon: ShoppingBag },
  { path: '/gallery', label: 'nav.gallery', icon: Grid3X3 },
  { path: '/challenge', label: 'nav.challenge', icon: Star },
  { path: '/docs', label: 'nav.docs', icon: BookOpen },
]

export function Layout() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()

  const THEME_CYCLE: Theme[] = ['light', 'dark', 'system']
  const nextTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme)
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]!
    setTheme(next)
  }

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'

  const translatedNav = NAV_ITEMS.map(({ path, label: labelKey, icon: Icon }) => ({
    path,
    label: t(labelKey),
    icon: Icon,
  }))

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <Bot size={20} />
            </div>
            <span className={styles.logoText}>CyberAgent</span>
          </Link>

          <nav className={styles.nav}>
            {translatedNav.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`${styles.navLink} ${location.pathname === path ? styles.navLinkActive : ''}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <div className={styles.headerActions}>
            <LanguageToggle />
            <button
              onClick={nextTheme}
              className={styles.themeToggle}
              title={`Theme: ${themeLabel}`}
              aria-label={`Switch theme, current: ${themeLabel}`}
            >
              <ThemeIcon size={18} />
            </button>
            <a
              href="https://github.com/unbug/cyber-agent"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.githubLink}
            >
              <Github size={20} />
            </a>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <FrozenOutlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerText}>
            {t('footer.rights')}
          </span>
          <span className={styles.footerMuted}>
            &copy; {new Date().getFullYear()} unbug
          </span>
        </div>
      </footer>
    </div>
  )
}
