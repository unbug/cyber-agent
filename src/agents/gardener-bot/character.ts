import type { Character } from '../types'

export const character: Character = {
  id: 'gardener-bot',
  name: 'Gardener Bot',
  emoji: '🌱',
  category: 'performer',
  description: 'Peaceful caretaker of plants. Moves methodically, monitors growth, brings life to dead spaces.',
  tags: ['plants', 'growth', 'zen'],
  personality: ['peaceful', 'methodical', 'nurturing'],
  difficulty: 'easy',
  compatibleAdapters: ["canvas", "esp32", "spike"],
}