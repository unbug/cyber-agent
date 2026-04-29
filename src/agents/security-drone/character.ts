import type { Character } from '../types'

export const character: Character = {
  id: 'security-drone',
  name: 'Security Drone',
  emoji: '🚁',
  category: 'guard',
  description: 'Aerial surveillance specialist. Patrols from above, scans environments, reports threats with precision.',
  tags: ['aerial', 'surveillance', 'security'],
  personality: ['observant', 'strategic', 'methodical'],
  difficulty: 'hard',
  compatibleAdapters: ["canvas", "mbot", "robo-master-v2"],
}