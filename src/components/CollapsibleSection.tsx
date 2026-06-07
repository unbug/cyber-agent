/**
 * CollapsibleSection — A collapsible panel wrapper for the /debug page.
 *
 * Reduces visual clutter by letting users toggle sections on/off.
 * Collapsed state is persisted in localStorage per section key.
 */

import { useState, useEffect, type ReactNode } from 'react'
import styles from './CollapsibleSection.module.css'

interface CollapsibleSectionProps {
  /** Unique key for localStorage persistence (passed as React key) */
  sectionKey: string
  /** Section title displayed in the header */
  title: string
  /** Icon shown before the title */
  icon: string
  /** Badge count shown on the right */
  badge?: number
  /** Whether the section starts expanded (default: true) */
  defaultOpen?: boolean
  /** Content to render when expanded */
  children: ReactNode
  /** Optional subtitle or count */
  subtitle?: string
}

export function CollapsibleSection({
  sectionKey,
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
  subtitle,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(`debug-section-${sectionKey}`)
      return saved !== null ? saved === 'true' : defaultOpen
    } catch {
      return defaultOpen
    }
  })

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`debug-section-${sectionKey}`, String(open))
    } catch {
      // localStorage may be unavailable
    }
  }, [open, sectionKey])

  return (
    <div className={styles.section}>
      <button
        className={styles.header}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={styles.headerIcon}>
          {open ? '▼' : '▶'} {icon}
        </span>
        <span className={styles.headerTitle}>{title}</span>
        {subtitle && <span className={styles.headerSubtitle}>{subtitle}</span>}
        {badge !== undefined && badge > 0 && (
          <span className={styles.badge}>{badge}</span>
        )}
      </button>
      {open && <div className={styles.body}>{children}</div>}
    </div>
  )
}
