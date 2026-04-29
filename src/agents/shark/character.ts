import type { Character } from '../types'

export const character: Character = {
  id: 'shark',
  name: 'Shark',
  emoji: '🦈',
  category: 'guard',
  description: 'Relentless hunter of the deep. Circles with purpose, charges when prey is spotted.',
  tags: ['aggressive', 'relentless', 'ocean'],
  personality: ['focused', 'fierce', 'determined'],
  difficulty: 'hard',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
