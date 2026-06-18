import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { TooltipProvider } from './components/ui/tooltip'
import { Layout } from './components/layout/Layout'
import Home from './pages/Home'
import Compress from './pages/Compress'
import GifConverter from './pages/GifConverter'
import Settings from './pages/Settings'

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/compress" element={<Compress />} />
              <Route path="/gif" element={<GifConverter />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App
