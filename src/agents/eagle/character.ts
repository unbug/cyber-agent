import type { Character } from '../types'

export const character: Character = {
  id: 'eagle',
  name: 'Eagle',
  emoji: '🦅',
  category: 'explorer',
  description: 'A majestic eagle that soars high above then dives gracefully toward anything that catches its eye.',
  tags: ['soaring', 'dive', 'majestic', 'explorer'],
  personality: ['bold', 'observant', 'free'],
  difficulty: 'medium',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
