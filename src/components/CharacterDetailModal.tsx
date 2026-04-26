import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, FileCode, Download, Heart, Tag, Brain } from 'lucide-react'
import { HoverBeam } from '@/components/HoverBeam'
import type { Character } from '@/agents'
import { downloadCharacter } from '@/utils/downloadCharacter'
import { useI18n } from '@/i18n'
import styles from './CharacterDetailModal.module.css'

const CATEGORY_GRADIENTS: Record<string, string> = {
  companion: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  guard: 'linear-gradient(135deg, #ef4444, #f97316)',
  performer: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  explorer: 'linear-gradient(135deg, #10b981, #06b6d4)',
}

const CATEGORY_LABELS: Record<string, string> = {
  companion: 'Companion',
  guard: 'Guard',
  performer: 'Performer',
  explorer: 'Explorer',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10b981',
  medium: '#f59e0b',
  hard: '#ef4444',
}

interface CharacterDetailModalProps {
  character: Character | null
  onClose: () => void
}

export function CharacterDetailModal({ character, onClose }: CharacterDetailModalProps) {
  const { t } = useI18n()

  useEffect(() => {
    if (character) {
      document.body.style.overflow = 'hidden'
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleEsc)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleEsc)
      }
    }
  }, [character, onClose])

  if (!character) return null

  const gradient = CATEGORY_GRADIENTS[character.category] || CATEGORY_GRADIENTS.companion
  const catLabel = CATEGORY_LABELS[character.category] || character.category
  const diffColor = DIFFICULTY_COLORS[character.difficulty] || '#6b7280'

  const handleDownload = () => {
    downloadCharacter(character)
  }

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>

          {/* Header with gradient */}
          <div className={styles.header} style={{ background: gradient }}>
            <div className={styles.emoji}>{character.emoji}</div>
            <div className={styles.headerInfo}>
              <h2 className={styles.name}>{character.name}</h2>
              <div className={styles.badges}>
                <span className={styles.catBadge}>{catLabel}</span>
                <span className={styles.diffBadge} style={{ borderColor: diffColor, color: diffColor }}>
                  {character.difficulty}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className={styles.body}>
            <p className={styles.description}>{character.description}</p>

            {/* Personality */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Brain size={16} />
                <span className={styles.sectionTitle}>{t('detail.personality')}</span>
              </div>
              <div className={styles.traitList}>
                {character.personality.map((trait) => (
                  <span key={trait} className={styles.trait}>{trait}</span>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Tag size={16} />
                <span className={styles.sectionTitle}>{t('detail.tags')}</span>
              </div>
              <div className={styles.tagList}>
                {character.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.actions}>
              <HoverBeam size="line" colorVariant="sunset" strength={0.65}>
                <Link to={`/agent/${character.id}`} className={`${styles.actionBtn} ${styles.primary}`}>
                  <Heart size={16} />
                  <span>{t('detail.view_agent')}</span>
                  <ArrowRight size={14} />
                </Link>
              </HoverBeam>
              <HoverBeam size="line" colorVariant="ocean" strength={0.5}>
                <Link to={`/agent/${character.id}/editor`} className={styles.actionBtn}>
                  <FileCode size={16} />
                  <span>{t('detail.edit_bt')}</span>
                  <ArrowRight size={14} />
                </Link>
              </HoverBeam>
              <HoverBeam size="line" colorVariant="mono" strength={0.4}>
                <button className={styles.actionBtn} onClick={handleDownload}>
                  <Download size={16} />
                  <span>{t('detail.download')}</span>
                </button>
              </HoverBeam>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
