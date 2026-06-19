import { useState, useRef, useEffect, useCallback } from 'react'

const TEST_DIR = 'C:\\Users\\romap\\Videos\\NVIDIA\\Chameleon'

function useMediaPort() {
  const [port, setPort] = useState(0)
  useEffect(() => {
    window.api.mediaPort().then(setPort)
  }, [])
  return port
}

function toMediaUrl(port: number, filePath: string) {
  return `http://127.0.0.1:${port}/${encodeURIComponent(filePath)}`
}

interface VideoInfo {
  seekableStart: number
  seekableEnd: number
  duration: number
  bufferedRanges: Array<[number, number]>
  currentTime: number
  readyState: number
}

function getVideoInfo(v: HTMLVideoElement): VideoInfo {
  const bufferedRanges: Array<[number, number]> = []
  for (let i = 0; i < v.buffered.length; i++) {
    bufferedRanges.push([v.buffered.start(i), v.buffered.end(i)])
  }
  return {
    seekableStart: v.seekable.length > 0 ? v.seekable.start(0) : -1,
    seekableEnd: v.seekable.length > 0 ? v.seekable.end(0) : -1,
    duration: v.duration,
    bufferedRanges,
    currentTime: v.currentTime,
    readyState: v.readyState,
  }
}

function t(n: number) {
  return isFinite(n) ? n.toFixed(2) + 's' : String(n)
}

function VideoCard({ filePath, port }: { filePath: string; port: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [log, setLog] = useState<string[]>([])
  const name = filePath.split('\\').pop() ?? filePath

  const addLog = useCallback((msg: string) => {
    setLog((prev) =>
      [
        `${new Date().toLocaleTimeString('uk', { hour12: false })}.${String(Date.now() % 1000).padStart(3, '0')} ${msg}`,
        ...prev,
      ].slice(0, 40),
    )
  }, [])

  const refresh = useCallback(() => {
    if (videoRef.current) setInfo(getVideoInfo(videoRef.current))
  }, [])

  useEffect(() => {
    const int = setInterval(refresh, 500)
    return () => clearInterval(int)
  }, [refresh])

  if (!port) return null

  const src = toMediaUrl(port, filePath)

  return (
    <div className="border rounded-xl p-3 flex flex-col gap-2">
      <p className="text-xs font-medium truncate" title={name}>
        {name}
      </p>

      <video
        ref={videoRef}
        src={src}
        controls
        preload="metadata"
        className="w-full h-36 bg-black rounded"
        onLoadedMetadata={() => {
          addLog('loadedmetadata')
          refresh()
        }}
        onCanPlay={() => {
          addLog('canplay')
          refresh()
        }}
        onPlay={() => addLog('play')}
        onPause={() => addLog('pause')}
        onSeeking={() => {
          addLog(`seeking → ${videoRef.current?.currentTime.toFixed(2)}s`)
          refresh()
        }}
        onSeeked={() => {
          addLog(`seeked → ${videoRef.current?.currentTime.toFixed(2)}s`)
          refresh()
        }}
        onWaiting={() => addLog('waiting')}
        onStalled={() => addLog('stalled')}
        onError={(e) => {
          const err = (e.target as HTMLVideoElement).error
          addLog(`ERROR code=${err?.code} ${err?.message?.slice(0, 80)}`)
        }}
        onTimeUpdate={refresh}
      />

      {info && (
        <div className="grid grid-cols-2 gap-1 text-xs font-mono bg-muted/40 rounded p-2">
          <span className="text-muted-foreground">duration</span>
          <span>{t(info.duration)}</span>
          <span className="text-muted-foreground">currentTime</span>
          <span>{t(info.currentTime)}</span>
          <span className="text-muted-foreground">seekable</span>
          <span className={info.seekableEnd <= 0 ? 'text-destructive font-bold' : 'text-green-500'}>
            {info.seekableEnd > 0 ? `${t(info.seekableStart)} → ${t(info.seekableEnd)}` : 'EMPTY ✗'}
          </span>
          <span className="text-muted-foreground">buffered</span>
          <span>{info.bufferedRanges.map(([s, e]) => `${t(s)}-${t(e)}`).join(', ') || 'none'}</span>
          <span className="text-muted-foreground">readyState</span>
          <span>{info.readyState}</span>
        </div>
      )}

      <div className="text-[10px] font-mono bg-black/20 rounded p-1.5 h-24 overflow-y-auto flex flex-col gap-px">
        {log.length === 0 && <span className="text-muted-foreground">no events yet</span>}
        {log.map((l, i) => (
          <span
            key={i}
            className={
              l.includes('ERROR')
                ? 'text-destructive'
                : l.includes('seek')
                  ? 'text-yellow-400'
                  : 'text-green-400'
            }
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function VideoDebug() {
  const port = useMediaPort()
  const [files, setFiles] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    window.api.listDir(TEST_DIR).then((fs) => setFiles(fs.map((f) => f.fullPath)))
  }, [])

  function toggle(fp: string) {
    setSelected((prev) => (prev.includes(fp) ? prev.filter((x) => x !== fp) : [...prev, fp]))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h1 className="font-semibold text-sm">Video Debug</h1>
        <p className="text-xs text-muted-foreground">
          Вибери відео для тесту. Перевіряй seekable, buffered та події.
          {port > 0 && (
            <span className="ml-2 text-green-500">media server :{port}</span>
          )}
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 shrink-0 border-r overflow-y-auto p-2 flex flex-col gap-1">
          {files.map((fp) => {
            const name = fp.split('\\').pop() ?? fp
            const active = selected.includes(fp)
            return (
              <button
                key={fp}
                onClick={() => toggle(fp)}
                className={`text-left text-xs px-2 py-1.5 rounded truncate transition-colors ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                title={name}
              >
                {name}
              </button>
            )
          })}
          {files.length === 0 && <p className="text-xs text-muted-foreground p-2">Loading…</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 gap-4">
          {selected.length === 0 && (
            <p className="text-sm text-muted-foreground self-start">← Вибери файл(и) зліва</p>
          )}
          {selected.map((fp) => (
            <VideoCard key={fp} filePath={fp} port={port} />
          ))}
        </div>
      </div>
    </div>
  )
}
