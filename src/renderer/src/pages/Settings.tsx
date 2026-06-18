import { Sun, Moon, Monitor, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </h2>
  )
}

export default function Settings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="p-8 max-w-lg space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section>
        <SectionLabel>Appearance</SectionLabel>
        <div className="border rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="flex gap-2">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors',
                    theme === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-accent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Output</SectionLabel>
        <div className="border rounded-xl divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Output folder</p>
              <p className="text-xs text-muted-foreground mt-0.5">~/Downloads</p>
            </div>
            <Button variant="outline" size="sm">
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
              Change
            </Button>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Default format</p>
              <p className="text-xs text-muted-foreground mt-0.5">MP4</p>
            </div>
            <Button variant="outline" size="sm">Change</Button>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>About</SectionLabel>
        <div className="border rounded-xl px-4 py-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Electron</span>
            <span>{window?.electron?.process?.versions?.electron ?? '—'}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
