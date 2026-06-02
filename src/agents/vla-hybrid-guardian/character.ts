import type { Character } from '../types'

export const character: Character = {
  id: 'vla-hybrid-guardian',
  name: 'VLA Hybrid Guardian',
  emoji: '🤖',
  category: 'guard',
  description: 'A patrol guardian that uses a learned VLA policy for fine-grained observation when confidence is high, falling back to rule-based patrol otherwise. Blends authored personality with learned skills.',
  tags: ['hybrid', 'vla', 'guardian', 'patrol', 'learned-skill', 'experimental'],
  personality: ['vigilant', 'methodical', 'adaptive'],
  difficulty: 'hard',
  compatibleAdapters: ['robo-master-v2', 'esp32', 'unitree-go1'],
  emotionPreset: 'alert',
}
