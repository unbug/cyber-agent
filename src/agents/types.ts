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
