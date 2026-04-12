export interface Character {
  id: string
  name: string
  emoji: string
  category: 'companion' | 'guard' | 'performer' | 'explorer'
  description: string
  tags: string[]
  personality: string[]
  difficulty: 'easy' | 'medium' | 'hard'
}

export const characters: Character[] = [
  {
    id: 'loyal-dog',
    name: 'Loyal Dog',
    emoji: '🐕',
    category: 'companion',
    description: 'Follows you around, wags its tail when happy, barks at strangers. The classic faithful companion.',
    tags: ['friendly', 'active', 'social'],
    personality: ['loyal', 'energetic', 'playful'],
    difficulty: 'easy',
  },
  {
    id: 'curious-cat',
    name: 'Curious Cat',
    emoji: '🐈',
    category: 'explorer',
    description: 'Independent and elegant. Explores every corner, naps in sunny spots, demands attention on its own terms.',
    tags: ['independent', 'curious', 'graceful'],
    personality: ['independent', 'curious', 'affectionate'],
    difficulty: 'easy',
  },
  {
    id: 'guard-dino',
    name: 'Guard Dino',
    emoji: '🦖',
    category: 'guard',
    description: 'Patrols your space with prehistoric authority. Roars at intruders, surprisingly gentle with family.',
    tags: ['protective', 'powerful', 'loyal'],
    personality: ['vigilant', 'brave', 'territorial'],
    difficulty: 'medium',
  },
  {
    id: 'dance-bot',
    name: 'Dance Bot',
    emoji: '🤖',
    category: 'performer',
    description: 'Grooves to music, learns new moves, puts on shows. The life of every party.',
    tags: ['creative', 'rhythmic', 'entertaining'],
    personality: ['joyful', 'expressive', 'social'],
    difficulty: 'medium',
  },
  {
    id: 'zen-turtle',
    name: 'Zen Turtle',
    emoji: '🐢',
    category: 'companion',
    description: 'Slow, deliberate, peaceful. Meditates in quiet corners. Perfect stress-relief companion.',
    tags: ['calm', 'meditative', 'patient'],
    personality: ['peaceful', 'wise', 'patient'],
    difficulty: 'easy',
  },
  {
    id: 'scout-eagle',
    name: 'Scout Eagle',
    emoji: '🦅',
    category: 'explorer',
    description: 'Maps your entire space from above. Reports anomalies. The ultimate aerial reconnaissance agent.',
    tags: ['observant', 'fast', 'strategic'],
    personality: ['sharp', 'independent', 'strategic'],
    difficulty: 'hard',
  },
]

export function getCharacter(id: string): Character | undefined {
  return characters.find((c) => c.id === id)
}

export function getCharactersByCategory(category: Character['category']): Character[] {
  return characters.filter((c) => c.category === category)
}
