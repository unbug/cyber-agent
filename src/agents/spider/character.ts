import type { Character } from '../types'

export const character: Character = {
  id: 'spider',
  name: 'Spider',
  emoji: '🕷️',
  category: 'guard',
  description: 'A stealthy eight-legged guardian that weaves invisible traps and pounces on intruders.',
  tags: ['stealth', 'web', 'pounce', 'guardian'],
  personality: ['patient', 'precise', 'predatory'],
  difficulty: 'hard',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
