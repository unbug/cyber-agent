import type { Character } from '../types'

export const character: Character = {
  id: 'guardian-bot',
  name: 'Guardian Bot',
  emoji: '🛡️',
  category: 'guard',
  description: 'A vigilant guardian that patrols and alerts on detection. Senses proximity, bumps, and faces — only meaningful with perception sensors.',
  tags: ['guardian', 'perception-driven', 'vigilant', 'robot'],
  personality: ['vigilant', 'protective', 'methodical'],
  difficulty: 'medium',
  compatibleAdapters: ['canvas', 'esp32', 'mbot', 'robo-master-v2'],
}
