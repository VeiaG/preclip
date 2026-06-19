import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { JobsProvider } from './context/JobsContext'
import { TooltipProvider } from './components/ui/tooltip'
import { Layout } from './components/layout/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import GifConverter from './pages/GifConverter'
import Settings from './pages/Settings'
import VideoTest from './pages/VideoTest'
import VideoDebug from './pages/VideoDebug'

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/']}>
          <JobsProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/compress" element={<Compress />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/gif" element={<GifConverter />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/test" element={<VideoTest />} />
                <Route path="/debug" element={<VideoDebug />} />
              </Route>
            </Routes>
          </JobsProvider>
        </MemoryRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
