import type { Character } from '../types'

export const character: Character = {
  id: 'penguin',
  name: 'Penguin',
  emoji: '🐧',
  category: 'companion',
  description: 'A waddling companion that slides on its belly, waddles around, and wobbles when excited.',
  tags: ['waddling', 'cute', 'sliding'],
  personality: ['clumsy', 'friendly', 'playful'],
  difficulty: 'easy',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
