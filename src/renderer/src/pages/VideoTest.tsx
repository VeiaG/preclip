import { useState, useEffect } from 'react'

const TEST_DIR = 'C:\\Users\\romap\\Videos\\NVIDIA\\Chameleon'

function useMediaPort() {
  const [port, setPort] = useState(0)
  useEffect(() => {
    window.api.mediaPort().then(setPort)
  }, [])
  return port
}

export default function VideoTest() {
  const port = useMediaPort()
  const [files, setFiles] = useState<{ name: string; fullPath: string }[]>([])

  useEffect(() => {
    window.api.listDir(TEST_DIR).then(setFiles)
  }, [])

  if (!port) return <p className="p-4 text-sm text-muted-foreground">Starting media server…</p>

  return (
    <div className="p-4 overflow-y-auto flex flex-col gap-6">
      <h1 className="font-bold">Video Protocol Test</h1>
      <p className="text-xs text-muted-foreground">{TEST_DIR}</p>
      {files.length === 0 && <p className="text-muted-foreground text-sm">Loading…</p>}
      {files.map((f) => (
        <div key={f.fullPath} className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground truncate">{f.name}</p>
          <video
            src={`http://127.0.0.1:${port}/${encodeURIComponent(f.fullPath)}`}
            controls
            preload="metadata"
            className="w-full h-40 bg-black rounded"
            onError={(e) =>
              console.error('[video error]', f.name, (e.target as HTMLVideoElement).error)
            }
            onLoadedMetadata={(e) =>
              console.log('[video ok]', f.name, (e.target as HTMLVideoElement).duration)
            }
          />
        </div>
      ))}
    </div>
  )
}
