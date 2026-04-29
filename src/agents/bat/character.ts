import type { Character } from '../types'

export const character: Character = {
  id: 'bat',
  name: 'Bat',
  emoji: '🦇',
  category: 'explorer',
  description: 'A nocturnal bat that flits erratically in shadowy patterns, diving toward the pointer with sonar-like sweeps.',
  tags: ['nocturnal', 'flying', 'sonar', 'explorer'],
  personality: ['mysterious', 'agile', 'nocturnal'],
  difficulty: 'medium',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
