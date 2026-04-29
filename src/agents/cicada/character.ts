import type { Character } from '../types'

export const character: Character = {
  id: 'cicada',
  name: 'Cicada',
  emoji: '🪲',
  category: 'explorer',
  description: 'Noisy summer insect that buzzes erratically around light sources and bright spots with relentless energy.',
  tags: ['noisy', 'erratic', 'persistent'],
  personality: ['restless', 'loud', 'energetic'],
  difficulty: 'easy',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
