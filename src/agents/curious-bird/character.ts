import type { Character } from '../types'

export const character: Character = {
  id: 'curious-bird',
  name: 'Curious Bird',
  emoji: '🐦',
  category: 'explorer',
  description: 'A curious bird that flies toward detected objects and sings when alone. Only meaningful with perception — without it, just a simple wanderer.',
  tags: ['curious', 'perception-driven', 'explorer', 'bird'],
  personality: ['curious', 'free-spirited', 'melodic'],
  difficulty: 'medium',
  compatibleAdapters: ['canvas', 'esp32', 'spike', 'mbot', 'robo-master-v2'],
}
