/**
 * Cat-Dog Demo — two agents with social BT behaviors.
 */

import { cat, dog } from './character'

/** Characters available in the demo */
export const demoCharacters = [cat, dog]

/** Demo description */
export const demoInfo = {
  id: 'cat-dog-demo',
  title: 'Cat × Dog Demo',
  description: 'A shy cat and playful dog interact using social BT primitives. Watch the cat flee when the dog approaches, then warm up when the dog backs off.',
  emoji: '🐱🐶',
}
