import type { Character } from '../types'

export const character: Character = {
  id: 'mantis',
  name: 'Mantis',
  emoji: '🦗',
  category: 'explorer',
  description: 'A tiny warrior that waits patiently near the pointer, then strikes with lightning speed before retreating.',
  tags: ['strike', 'tiny', 'patient'],
  personality: ['patient', 'precise', 'tiny'],
  difficulty: 'hard',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
