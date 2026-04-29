import type { Character } from '../types'

export const character: Character = {
  id: 'robot-helper',
  name: 'Robot Helper',
  emoji: '🤖',
  category: 'companion',
  description: 'A dedicated assistant robot that organizes tasks and keeps your space tidy. Never stops working, always ready to help.',
  tags: ['helpful', 'organized', 'reliable', 'productive'],
  personality: ['diligent', 'pragmatic', 'efficient', 'trustworthy'],
  difficulty: 'easy',
  compatibleAdapters: ["canvas", "esp32", "mbot"],
}
