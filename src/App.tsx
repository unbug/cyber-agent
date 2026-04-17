import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/Home'
import { GalleryPage } from './pages/Gallery'
import { AgentPage } from './pages/Agent'
import { DocsPage } from './pages/Docs'
import CharacterEditor from './pages/CharacterEditor'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />} >
        <Route path="/" element={<HomePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/agent/:id" element={<AgentPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/agent/:id/editor" element={<CharacterEditor />} />
      </Route>
    </Routes>
  )
}
