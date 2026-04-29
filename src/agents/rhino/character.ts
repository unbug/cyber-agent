import type { Character } from '../types'

export const character: Character = {
  id: 'rhino',
  name: 'Rhino',
  emoji: '🦏',
  category: 'guard',
  description: 'A powerful territorial guardian that charges at threats and stands its ground.',
  tags: ['powerful', 'charge', 'territorial', 'tank'],
  personality: ['fierce', 'resolute', 'imposing'],
  difficulty: 'hard',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
