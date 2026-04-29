import type { Character } from '../types'

export const character: Character = {
  id: 'whale',
  name: 'Whale',
  emoji: '🐋',
  category: 'companion',
  description: 'A majestic deep-sea drifter that swims gracefully and sings melodic pulses.',
  tags: ['ocean', 'drift', 'song', 'gentle'],
  personality: ['gentle', 'majestic', 'melancholic'],
  difficulty: 'medium',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
