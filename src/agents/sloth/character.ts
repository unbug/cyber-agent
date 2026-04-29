import type { Character } from '../types'

export const character: Character = {
  id: 'sloth',
  name: 'Sloth',
  emoji: '🦥',
  category: 'companion',
  description: 'An ultra-lazy sloth that drifts at a glacial pace, pausing for long yawns and naps.',
  tags: ['lazy', 'slow', 'chill', 'companion'],
  personality: ['lazy', 'gentle', 'peaceful'],
  difficulty: 'easy',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
