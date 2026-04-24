/**
 * Download a character definition as a JSON file.
 */
export function downloadCharacter(character: {
  id: string
  name: string
  emoji: string
  description: string
  tags: string[]
  difficulty: string
  category: string
  behaviorTree?: any
}): void {
  const data = {
    id: character.id,
    name: character.name,
    emoji: character.emoji,
    description: character.description,
    tags: character.tags,
    difficulty: character.difficulty,
    category: character.category,
    behaviorTree: character.behaviorTree || null,
    exportedAt: new Date().toISOString(),
    source: 'CyberAgent Marketplace',
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${character.id}-marketplace.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
