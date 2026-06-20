import { useEffect, useState, useCallback } from 'react'
import { Sun, Moon, Monitor, FolderOpen, Minus, Plus, Gamepad2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AppSettings } from '../../../shared/types'

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

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes > 0) return `${(bytes / 1024).toFixed(0)} KB`
  return 'Empty'
}

export default function Settings() {
  const [settings, setSettingsState] = useState<AppSettings | null>(null)
  const [cacheSize, setCacheSize] = useState<number>(0)
  const [clearing, setClearing] = useState(false)

  const refreshCacheSize = useCallback(() => {
    window.api.getThumbnailCacheSize().then(setCacheSize)
  }, [])

  useEffect(() => {
    window.api.getSettings().then(setSettingsState)
    refreshCacheSize()
  }, [refreshCacheSize])

  const save = async (partial: Partial<AppSettings>) => {
    const updated = await window.api.setSettings(partial)
    setSettingsState(updated)
  }

  const handleChangeOutputDir = async () => {
    const dir = await window.api.openDir()
    if (dir !== null) save({ outputDir: dir })
  }

  const handleChangeNvidiaPath = async () => {
    const dir = await window.api.openDir()
    if (dir !== null) save({ nvidiaCapturesPath: dir })
  }

  const handleClearCache = async () => {
    setClearing(true)
    await window.api.clearThumbnailCache()
    refreshCacheSize()
    setClearing(false)
  }

  return (
    <div className="p-8 max-w-lg space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section>
        <SectionLabel>Processing</SectionLabel>
        <div className="border rounded-xl divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Max parallel jobs</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                How many conversions run simultaneously
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => settings && save({ maxParallelJobs: Math.max(1, settings.maxParallelJobs - 1) })}
                disabled={!settings || settings.maxParallelJobs <= 1}
                className="w-7 h-7 flex items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums">
                {settings?.maxParallelJobs ?? 1}
              </span>
              <button
                onClick={() => settings && save({ maxParallelJobs: Math.min(8, settings.maxParallelJobs + 1) })}
                disabled={!settings || settings.maxParallelJobs >= 8}
                className="w-7 h-7 flex items-center justify-center rounded-md border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
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
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">
                {settings?.outputDir ?? 'Same folder as source file'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {settings?.outputDir && (
                <Button variant="ghost" size="sm" onClick={() => save({ outputDir: null })}>
                  Reset
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleChangeOutputDir}>
                <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                Change
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Game Library</SectionLabel>
        <div className="border rounded-xl divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                NVIDIA captures folder
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px] truncate">
                {settings?.nvidiaCapturesPath ?? 'Not configured'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {settings?.nvidiaCapturesPath && (
                <Button variant="ghost" size="sm" onClick={() => save({ nvidiaCapturesPath: null })}>
                  Reset
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleChangeNvidiaPath}>
                <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                {settings?.nvidiaCapturesPath ? 'Change' : 'Set'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Cache</SectionLabel>
        <div className="border rounded-xl divide-y">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">Thumbnail cache</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatSize(cacheSize)} of preview images
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={clearing || cacheSize === 0}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {clearing ? 'Clearing…' : 'Clear'}
            </Button>
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
