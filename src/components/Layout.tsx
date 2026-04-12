import { useState } from 'react'
import { useOutlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, BookOpen, Grid3X3, Github } from 'lucide-react'
import styles from './Layout.module.css'

/** Freeze outlet so exit animation keeps old content */
function FrozenOutlet() {
  const o = useOutlet()
  const [outlet] = useState(o)
  return outlet
}

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Bot },
  { path: '/gallery', label: 'Gallery', icon: Grid3X3 },
  { path: '/docs', label: 'Docs', icon: BookOpen },
]

export function Layout() {
  const location = useLocation()

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
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
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

          <a
            href="https://github.com/unbug/cyber-agent"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
          >
            <Github size={20} />
          </a>
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
            CyberAgent — Give your robot a soul
          </span>
          <span className={styles.footerMuted}>
            &copy; {new Date().getFullYear()} unbug
          </span>
        </div>
      </footer>
    </div>
  )
}
