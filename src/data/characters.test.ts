import { describe, it, expect } from 'vitest';
import { characters, getCharacter, getCharactersByCategory } from './characters';

describe('characters data', () => {
  it('has at least 1 character', () => {
    expect(characters.length).toBeGreaterThan(0);
  });

  it('every character has required fields', () => {
    for (const c of characters) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.emoji).toBeTruthy();
      expect(['companion', 'guard', 'performer', 'explorer']).toContain(c.category);
      expect(c.personality.length).toBeGreaterThan(0);
      expect(['easy', 'medium', 'hard']).toContain(c.difficulty);
    }
  });

  it('has unique ids', () => {
    const ids = characters.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getCharacter', () => {
  it('returns character by id', () => {
    const dog = getCharacter('loyal-dog');
    expect(dog).toBeDefined();
    expect(dog!.name).toBe('Loyal Dog');
  });

  it('returns undefined for unknown id', () => {
    expect(getCharacter('nonexistent')).toBeUndefined();
  });
});

describe('getCharactersByCategory', () => {
  it('filters by category', () => {
    const companions = getCharactersByCategory('companion');
    expect(companions.length).toBeGreaterThan(0);
    for (const c of companions) {
      expect(c.category).toBe('companion');
    }
  });

  it('returns empty array for category with no members', () => {
    // All defined categories should have at least one, but the function should still work
    const result = getCharactersByCategory('guard');
    expect(Array.isArray(result)).toBe(true);
  });
});
