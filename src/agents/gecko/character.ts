import type { Character } from '../types'

export const character: Character = {
  id: 'gecko',
  name: 'Gecko',
  emoji: '🦎',
  category: 'explorer',
  description: 'Stealthy wall-climber that darts along edges, suddenly freezes when observed, then dashes away.',
  tags: ['stealthy', 'climber', 'skittish'],
  personality: ['cautious', 'agile', 'curious'],
  difficulty: 'medium',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
