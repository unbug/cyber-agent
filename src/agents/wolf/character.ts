import type { Character } from '../types'

export const character: Character = {
  id: 'wolf',
  name: 'Wolf',
  emoji: '🐺',
  category: 'guard',
  description: 'Lone wolf. Howls at the moon, patrols the perimeter with intensity, never forgets a face.',
  tags: ['lone', 'howling', 'patrol'],
  personality: ['independent', 'watchful', 'loyal'],
  difficulty: 'medium',
  compatibleAdapters: ["canvas", "esp32", "spike", "mbot", "robo-master-v2"],
}
