import { useState, useEffect } from 'react'

const TEST_DIR = 'C:\\Users\\romap\\Videos\\NVIDIA\\Chameleon'

function useMediaPort() {
  const [port, setPort] = useState(0)
  useEffect(() => { window.api.mediaPort().then(setPort) }, [])
  return port
}

function pathToMediaUrl(port: number, p: string) {
  return `http://127.0.0.1:${port}/${encodeURIComponent(p)}`
}

function remuxPath(p: string) {
  const dot = p.lastIndexOf('.')
  return dot >= 0 ? `${p.slice(0, dot)}_faststart${p.slice(dot)}` : `${p}_faststart`
}

interface VideoEntry {
  name: string
  fullPath: string
  faststart: boolean | null
  remuxing: boolean
  remuxedPath: string | null
  remuxError: string | null
}

export default function VideoTest() {
  const port = useMediaPort()
  const [entries, setEntries] = useState<VideoEntry[]>([])

  useEffect(() => {
    window.api.listDir(TEST_DIR).then(async (files) => {
      const initial: VideoEntry[] = files.map((f) => ({
        name: f.name,
        fullPath: f.fullPath,
        faststart: null,
        remuxing: false,
        remuxedPath: null,
        remuxError: null,
      }))
      setEntries(initial)

      // Check faststart status for each file
      for (const f of files) {
        const ok = await window.api.hasFaststart(f.fullPath)
        setEntries((prev) =>
          prev.map((e) => (e.fullPath === f.fullPath ? { ...e, faststart: ok } : e)),
        )
      }
    })
  }, [])

  async function handleRemux(entry: VideoEntry) {
    const out = remuxPath(entry.fullPath)
    setEntries((prev) =>
      prev.map((e) =>
        e.fullPath === entry.fullPath ? { ...e, remuxing: true, remuxError: null } : e,
      ),
    )
    try {
      await window.api.remuxFaststart(entry.fullPath, out)
      setEntries((prev) =>
        prev.map((e) =>
          e.fullPath === entry.fullPath
            ? { ...e, remuxing: false, remuxedPath: out, faststart: true }
            : e,
        ),
      )
    } catch (err) {
      setEntries((prev) =>
        prev.map((e) =>
          e.fullPath === entry.fullPath
            ? { ...e, remuxing: false, remuxError: String(err) }
            : e,
        ),
      )
    }
  }

  return (
    <div className="p-4 overflow-y-auto flex flex-col gap-6">
      <h1 className="font-bold">Video Protocol Test</h1>
      <p className="text-xs text-muted-foreground">{TEST_DIR}</p>
      {entries.length === 0 && <p className="text-muted-foreground text-sm">Loading...</p>}
      {entries.map((entry) => {
        const playPath = entry.remuxedPath ?? entry.fullPath
        if (!port) return null
        return (
          <div key={entry.fullPath} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate flex-1">{entry.name}</p>
              {entry.faststart === false && !entry.remuxedPath && (
                <button
                  disabled={entry.remuxing}
                  onClick={() => handleRemux(entry)}
                  className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50 shrink-0"
                >
                  {entry.remuxing ? 'Remuxing…' : 'Fix (moov at end)'}
                </button>
              )}
              {entry.faststart === true && (
                <>
                  <span className="text-xs text-green-600 dark:text-green-400 shrink-0">✓ faststart</span>
                  <button
                    disabled={entry.remuxing}
                    onClick={() => handleRemux(entry)}
                    className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 disabled:opacity-50 shrink-0"
                  >
                    {entry.remuxing ? 'Remuxing…' : 'Re-remux audio'}
                  </button>
                </>
              )}
              {entry.remuxedPath && (
                <span className="text-xs text-blue-500 shrink-0">playing remux</span>
              )}
            </div>
            {entry.remuxError && (
              <p className="text-xs text-destructive">{entry.remuxError}</p>
            )}
            <video
              key={playPath}
              src={pathToMediaUrl(port, playPath)}
              controls
              preload="metadata"
              muted
              className="w-full h-40 bg-black rounded"
              onError={(e) =>
                console.error('[video error]', entry.name, (e.target as HTMLVideoElement).error)
              }
              onLoadedMetadata={(e) =>
                console.log('[video ok]', entry.name, (e.target as HTMLVideoElement).duration)
              }
            />
          </div>
        )
      })}
    </div>
  )
}
