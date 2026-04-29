import type { Character } from '../types'

export const character: Character = {
  id: 'mandrill',
  name: 'Mandrill',
  emoji: '🐵',
  category: 'companion',
  description: 'Expressive social primate that mimics pointer movements, beats its chest when excited, and seeks attention.',
  tags: ['expressive', 'social', 'playful'],
  personality: ['playful', 'attention-seeking', 'clever'],
  difficulty: 'medium',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
