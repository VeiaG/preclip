import { useEffect, useState } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { JobsProvider } from './context/JobsContext'
import { TooltipProvider } from './components/ui/tooltip'
import { Layout } from './components/layout/Layout'
import Home from './pages/Home'
import VideoEditor from './pages/VideoEditor'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import GifConverter from './pages/GifConverter'
import Settings from './pages/Settings'
import Hub from './pages/Hub'
import GameFolder from './pages/GameFolder'
import type { StartPage } from '../../shared/types'

const FALLBACK_START: StartPage = '/hub'

function App(): React.JSX.Element | null {
  // MemoryRouter fixes its initial entry on mount, so the router can't render
  // until settings have told us which page to open on.
  const [startPage, setStartPage] = useState<StartPage | null>(null)

  useEffect(() => {
    window.api
      .getSettings()
      .then((s) => setStartPage(s.startPage ?? FALLBACK_START))
      .catch(() => setStartPage(FALLBACK_START))
  }, [])

  if (!startPage) return null

  return (
      <TooltipProvider>
        <MemoryRouter initialEntries={[startPage]}>
          <JobsProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/compress" element={<VideoEditor />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/gif" element={<GifConverter />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/hub" element={<Hub />} />
                <Route path="/hub/folder" element={<GameFolder />} />
                <Route path="/editor" element={<VideoEditor />} />
              </Route>
            </Routes>
          </JobsProvider>
        </MemoryRouter>
      </TooltipProvider>
  )
}

export default App
