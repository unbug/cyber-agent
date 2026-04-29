import type { Character } from '../types'

export const character: Character = {
  id: 'fox',
  name: 'Fox',
  emoji: '🦊',
  category: 'companion',
  description: 'Cunning and clever. Steals the spotlight with playful tricks and mischievous curiosity.',
  tags: ['clever', 'playful', 'stealthy'],
  personality: ['cunning', 'playful', 'resourceful'],
  difficulty: 'medium',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
