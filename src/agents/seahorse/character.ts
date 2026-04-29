import type { Character } from '../types'

export const character: Character = {
  id: 'seahorse',
  name: 'Seahorse',
  emoji: '🐴',
  category: 'companion',
  description: 'Gentle sea companion that sways gracefully with the current, drifting peacefully and nuzzling nearby.',
  tags: ['gentle', 'graceful', 'peaceful'],
  personality: ['calm', 'affectionate', 'serene'],
  difficulty: 'easy',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
