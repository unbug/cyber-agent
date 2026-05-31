/**
 * Cat-Dog Demo — Two characters with believable social interaction.
 *
 * 🐱 Cat: Shy but curious. Flees when dog gets too close,
 *   warms up when dog is far away, mirrors dog's emotion when calm.
 *
 * 🐶 Dog: Playful and friendly. Seeks out the cat, greets when close,
 *   backs off when cat flees, broadcasts happy emotion.
 */

import type { Character } from '../types'

export const cat = {
  character: {
    id: 'demo-cat',
    name: 'Shy Cat',
    emoji: '🐱',
    category: 'companion',
    description: 'A shy cat that warms up over time. Flees from the dog but mirrors its mood when calm.',
    tags: ['shy', 'curious', 'social'],
    personality: ['shy', 'playful', 'observant'],
    difficulty: 'medium',
    compatibleAdapters: ['canvas', 'esp32', 'spike', 'mbot', 'robo-master-v2'],
  } as Character,
} as const

export const dog = {
  character: {
    id: 'demo-dog',
    name: 'Playful Dog',
    emoji: '🐶',
    category: 'companion',
    description: 'A friendly dog who wants to play. Seeks out the cat, greets, and backs off when needed.',
    tags: ['friendly', 'active', 'social'],
    personality: ['energetic', 'playful', 'empathetic'],
    difficulty: 'easy',
    compatibleAdapters: ['canvas', 'esp32', 'spike', 'mbot', 'robo-master-v2'],
  } as Character,
} as const
