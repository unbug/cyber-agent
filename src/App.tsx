import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Layout } from './components/Layout'
import { HomePage } from './pages/Home'
import { useState } from 'react'
import type { BTEditionNode } from './engine/types'

// Route-level code splitting — first paint loads only Home + shared shell.
const GalleryPage = lazy(() => import('./pages/Gallery').then((m) => ({ default: m.GalleryPage })))
const AgentPage = lazy(() => import('./pages/Agent').then((m) => ({ default: m.AgentPage })))
const DocsPage = lazy(() => import('./pages/Docs').then((m) => ({ default: m.DocsPage })))
const ChallengePage = lazy(() => import('./pages/ChallengePage').then((m) => ({ default: m.ChallengePage })))
const MarketplacePage = lazy(() => import('./pages/MarketplacePage').then((m) => ({ default: m.MarketplacePage })))
const DebugPage = lazy(() => import('./pages/DebugPage').then((m) => ({ default: m.DebugPage })))
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage').then((m) => ({ default: m.PlaygroundPage })))
const ConnectPage = lazy(() => import('./pages/Connect').then((m) => ({ default: m.ConnectPage })))
const RoomPage = lazy(() => import('./pages/Room').then((m) => ({ default: m.RoomPage })))
const CharacterEditor = lazy(() => import('./pages/CharacterEditor'))
const BTGraphEditor = lazy(() => import('./pages/BTGraphEditor'))

function PageFallback() {
  return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
      …
    </div>
  )
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route element={<Layout />} >
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/agent/:id" element={<AgentPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/debug" element={<DebugPage />} />
        <Route path="/agent/:id/editor" element={<CharacterEditor />} />
        <Route path="/editor/new" element={<CharacterEditor />} />
        <Route path="/editor/create" element={<CharacterEditor />} />
        <Route path="/editor" element={<BTGraphEditorPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/room" element={<RoomPage />} />
      </Route>
    </Routes>
    </Suspense>
  )
}

function BTGraphEditorPage() {
  const [root, setRoot] = useState<BTEditionNode | null>(null)
  return <BTGraphEditor root={root} onChange={setRoot} onSave={setRoot} />
}
