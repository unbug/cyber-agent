import type { Character } from '../types'

export const character: Character = {
  id: 'shy-cat',
  name: 'Shy Cat',
  emoji: '🙀',
  category: 'companion',
  description: 'A timid feline that hides from strangers but warms up to familiar faces. Only makes sense with perception — reacts to face detection and proximity.',
  tags: ['shy', 'perception-driven', 'reactive', 'cat'],
  personality: ['timid', 'affectionate', 'easily-startled'],
  difficulty: 'easy',
  compatibleAdapters: ['canvas', 'esp32', 'spike', 'mbot', 'robo-master-v2'],
}
