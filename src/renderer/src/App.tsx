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
import VideoTest from './pages/VideoTest'
import VideoDebug from './pages/VideoDebug'
import Hub from './pages/Hub'
import GameFolder from './pages/GameFolder'

function App(): React.JSX.Element {
  return (
      <TooltipProvider>
        <MemoryRouter initialEntries={['/']}>
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
                <Route path="/test" element={<VideoTest />} />
                <Route path="/debug" element={<VideoDebug />} />
              </Route>
            </Routes>
          </JobsProvider>
        </MemoryRouter>
      </TooltipProvider>
  )
}

export default App
