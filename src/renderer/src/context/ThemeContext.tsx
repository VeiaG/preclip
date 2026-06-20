import { createContext, useContext, useEffect, useState } from 'react'
import { VISUAL_THEMES, type VisualTheme } from '@/lib/themes'
export type { VisualTheme }

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  visualTheme: VisualTheme
  setVisualTheme: (vt: VisualTheme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'system'
  )
  const [visualTheme, setVisualThemeState] = useState<VisualTheme>(
    () => (localStorage.getItem('visual-theme') as VisualTheme) || 'default'
  )
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (t: Theme) => {
      const resolved =
        t === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : t
      setResolvedTheme(resolved)
      root.classList.toggle('dark', resolved === 'dark')
    }

    applyTheme(theme)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    return
  }, [theme])

  const setTheme = (t: Theme) => {
    localStorage.setItem('theme', t)
    setThemeState(t)
  }

useEffect(() => {
  const root = document.documentElement
  const allThemeClasses = VISUAL_THEMES.filter((t) => t.slug !== 'default').map((t) => `theme-${t.slug}`)
  root.classList.remove(...allThemeClasses)
    root.classList.add(`theme-${visualTheme}`)
}, [visualTheme])

const setVisualTheme = (vt: VisualTheme) => {
  localStorage.setItem('visual-theme', vt)
  setVisualThemeState(vt)
}

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, visualTheme, setVisualTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
