import type { Character } from '../types'

export const character: Character = {
  id: 'elephant',
  name: 'Elephant',
  emoji: '🐘',
  category: 'companion',
  description: 'A slow, gentle giant. Moves deliberately, trumpets at the pointer. Calm and wise.',
  tags: ['slow', 'gentle', 'wise'],
  personality: ['calm', 'patient', 'protective'],
  difficulty: 'easy',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
