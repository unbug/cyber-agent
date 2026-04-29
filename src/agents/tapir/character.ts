import type { Character } from '../types'

export const character: Character = {
  id: 'tapir',
  name: 'Tapir',
  emoji: '🦓',
  category: 'companion',
  description: 'Gentle giant that wanders slowly, stops to graze, and nuzzles toward the pointer affectionately.',
  tags: ['gentle', 'slow', 'affectionate'],
  personality: ['gentle', 'patient', 'friendly'],
  difficulty: 'easy',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
