import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/Home'
import { GalleryPage } from './pages/Gallery'
import { AgentPage } from './pages/Agent'
import { DocsPage } from './pages/Docs'
import { ChallengePage } from './pages/ChallengePage'
import CharacterEditor from './pages/CharacterEditor'
import BTGraphEditor from './pages/BTGraphEditor'
import { useState } from 'react'
import type { BTEditionNode } from './engine/types'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />} >
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/agent/:id" element={<AgentPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/agent/:id/editor" element={<CharacterEditor />} />
        <Route path="/editor" element={<BTGraphEditorPage />} />
      </Route>
    </Routes>
  )
}

function BTGraphEditorPage() {
  const [root, setRoot] = useState<BTEditionNode | null>(null)
  return <BTGraphEditor root={root} onChange={setRoot} onSave={setRoot} />
}
