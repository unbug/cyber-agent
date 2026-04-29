import type { Character } from '../../agents/types'

export const character: Character = {
  id: 'unitree-loyal-dog',
  name: 'Unitree Loyal Dog',
  emoji: '🤖',
  category: 'companion',
  description: 'A versatile quadruped companion with advanced terrain responses. Loyal, adaptable, and built for real-world navigation.',
  tags: ['loyal', 'four-legged', 'terrain-adaptive'],
  personality: ['devoted', 'protective', 'playful'],
  difficulty: 'medium',
  compatibleAdapters: ["canvas", "esp32", "unitree", "unitree-go1"],
}
