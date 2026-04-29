import type { Character } from '../types'

export const character: Character = {
  id: 'dance-bot',
  name: 'Dance Bot',
  emoji: '🤖',
  category: 'performer',
  description: 'Grooves to music, learns new moves, puts on shows. The life of every party.',
  tags: ['creative', 'rhythmic', 'entertaining'],
  personality: ['joyful', 'expressive', 'social'],
  difficulty: 'medium',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
