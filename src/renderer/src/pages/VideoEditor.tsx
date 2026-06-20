import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Scissors, Play, Pause, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FileInfo {
  path: string
  name: string
  size: number
}

const FORMATS = ['mp4', 'webm', 'mov'] as const
type Format = (typeof FORMATS)[number]
type QualityKey = 'low' | 'medium' | 'high' | 'original'

const QUALITY_PRESETS = [
  { key: 'low'      as QualityKey, label: 'Low',      subtitle: 'Smaller file',  quality: 25,  sizeRatio: 0.08 },
  { key: 'medium'   as QualityKey, label: 'Medium',   subtitle: 'Balanced',      quality: 55,  sizeRatio: 0.20 },
  { key: 'high'     as QualityKey, label: 'High',     subtitle: 'Recommended',   quality: 80,  sizeRatio: 0.40 },
  { key: 'original' as QualityKey, label: 'Original', subtitle: 'Best quality',  quality: 100, sizeRatio: 0.80 },
]

const SCALES = [
  { label: '1×',    value: 1    },
  { label: '0.75×', value: 0.75 },
  { label: '0.5×',  value: 0.5  },
  { label: '0.25×', value: 0.25 },
] as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function formatSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function estimateSize(inputSize: number, sizeRatio: number, scale: number, clipDuration: number, duration: number): number {
  const trimRatio = duration > 0 ? Math.min(clipDuration / duration, 1) : 1
  return Math.round(inputSize * sizeRatio * (scale * scale) * trimRatio)
}

// ── TrimBar ───────────────────────────────────────────────────────────────────

interface TrimBarProps {
  duration: number
  start: number
  end: number
  currentTime: number
  frames: string[]
  onChange: (start: number, end: number) => void
  onSeek: (time: number) => void
}

function TrimBar({ duration, start, end, currentTime, frames, onChange, onSeek }: TrimBarProps) {
  const barRef   = useRef<HTMLDivElement>(null)
  const dragRef  = useRef<'start' | 'end' | null>(null)
  const startRef = useRef(start)
  const endRef   = useRef(end)
  const durRef   = useRef(duration)
  const cbRef    = useRef(onChange)

  useEffect(() => { startRef.current = start    }, [start])
  useEffect(() => { endRef.current   = end      }, [end])
  useEffect(() => { durRef.current   = duration }, [duration])
  useEffect(() => { cbRef.current    = onChange }, [onChange])

  const timeFromX = useCallback((clientX: number) => {
    if (!barRef.current) return 0
    const rect = barRef.current.getBoundingClientRect()
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * durRef.current
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const t = timeFromX(e.clientX)
      if (dragRef.current === 'start') cbRef.current(Math.min(t, endRef.current - 0.25), endRef.current)
      else cbRef.current(startRef.current, Math.max(t, startRef.current + 0.25))
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [timeFromX])

  const pct = (t: number) => `${duration > 0 ? Math.min(Math.max((t / duration) * 100, 0), 100) : 0}%`

  return (
    <div
      ref={barRef}
      className="relative h-12 select-none cursor-pointer"
      onClick={(e) => { if (!dragRef.current) onSeek(timeFromX(e.clientX)) }}
    >
      <div className="absolute inset-0 rounded-lg overflow-hidden bg-muted">
        {frames.length > 0 && (
          <div className="absolute inset-0 flex">
            {frames.map((url, i) => (
              <img key={i} src={url} className="flex-1 h-full object-cover" style={{ minWidth: 0 }} draggable={false} />
            ))}
          </div>
        )}
        <div className="absolute inset-y-0 left-0 bg-black/55" style={{ right: `${100 - parseFloat(pct(start))}%` }} />
        <div className="absolute inset-y-0 right-0 bg-black/55" style={{ left: pct(end) }} />
        <div
          className="absolute inset-y-0 border-y-2 border-primary pointer-events-none"
          style={{ left: pct(start), right: `${100 - parseFloat(pct(end))}%` }}
        />
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 pointer-events-none" style={{ left: pct(currentTime) }} />
      </div>

      {(['start', 'end'] as const).map((side) => (
        <div
          key={side}
          className="absolute top-0 bottom-0 w-6 -translate-x-1/2 z-10 flex items-center justify-center cursor-ew-resize"
          style={{ left: pct(side === 'start' ? start : end) }}
          onMouseDown={(e) => { e.stopPropagation(); dragRef.current = side }}
        >
          <div className="w-1.5 h-10 rounded bg-primary shadow-lg" />
        </div>
      ))}
    </div>
  )
}

// ── OptionButton ──────────────────────────────────────────────────────────────

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-0.5 p-2.5 rounded-xl border text-center transition-all',
        selected ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VideoEditor() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const stateFile = (location.state as { file?: FileInfo } | null)?.file ?? null

  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(stateFile)
  const [isDragging,   setIsDragging]   = useState(false)
  const [mediaPort,    setMediaPort]    = useState(0)

  const videoRef    = useRef<HTMLVideoElement>(null)
  const [duration,    setDuration]    = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying,   setIsPlaying]   = useState(false)
  const [videoMeta,   setVideoMeta]   = useState({ width: 0, height: 0 })
  const [trimStart,   setTrimStart]   = useState(0)
  const [trimEnd,     setTrimEnd]     = useState(0)
  const [qualityKey,  setQualityKey]  = useState<QualityKey>('high')
  const [scale,       setScale]       = useState(1)
  const [format,      setFormat]      = useState<Format>('mp4')
  const [frames,      setFrames]      = useState<string[]>([])
  const [submitting,  setSubmitting]  = useState(false)

  useEffect(() => { window.api.mediaPort().then(setMediaPort) }, [])

  const videoSrc = mediaPort && selectedFile
    ? `http://127.0.0.1:${mediaPort}/${encodeURIComponent(selectedFile.path)}`
    : undefined

  useEffect(() => {
    if (!selectedFile || !mediaPort) return
    setFrames([])
    window.api.getFrames(selectedFile.path, 20)
      .then(paths => setFrames(paths.map(p => `http://127.0.0.1:${mediaPort}/${encodeURIComponent(p)}`)))
      .catch(() => {})
  }, [selectedFile, mediaPort])

  const handleLoadedMetadata = () => {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration)
    setTrimStart(0)
    setTrimEnd(v.duration)
    setVideoMeta({ width: v.videoWidth, height: v.videoHeight })
  }

  const handleTimeUpdate = () => {
    const t = videoRef.current?.currentTime ?? 0
    setCurrentTime(t)
    if (trimEnd > 0 && t >= trimEnd) {
      const v = videoRef.current
      if (v) { v.currentTime = trimStart; if (!v.paused) v.play() }
    }
  }

  const handleTrimChange = useCallback((s: number, e: number) => { setTrimStart(s); setTrimEnd(e) }, [])
  const handleSeek       = useCallback((t: number) => { if (videoRef.current) videoRef.current.currentTime = t }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      if (v.currentTime < trimStart || v.currentTime >= trimEnd) v.currentTime = trimStart
      v.play()
    } else {
      v.pause()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (!f || !f.type.startsWith('video/')) return
    setSelectedFile({ path: window.api.getPathForFile(f), name: f.name, size: f.size })
  }

  const handlePickFile = async () => {
    const result = await window.api.openVideoFile()
    if (result) setSelectedFile(result)
  }

  const handleSubmit = async () => {
    if (!selectedFile || submitting) return
    setSubmitting(true)
    try {
      const preset     = QUALITY_PRESETS.find(p => p.key === qualityKey)!
      const isFullClip = trimStart <= 0.1 && trimEnd >= duration - 0.1
      await window.api.addJob({
        type: 'compress',
        inputPath: selectedFile.path,
        inputSize: selectedFile.size,
        name: selectedFile.name,
        metadata: {
          quality:   preset.quality,
          scale,
          format,
          trimStart: isFullClip ? undefined : trimStart,
          trimEnd:   isFullClip ? undefined : trimEnd,
        },
      })
      navigate('/jobs')
    } finally {
      setSubmitting(false)
    }
  }

  const clipDuration = trimEnd - trimStart
  const isEditorMode = stateFile !== null

  // ── File picker ──────────────────────────────────────────────────────────────
  if (!selectedFile) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-3.5 border-b flex items-center gap-3 shrink-0">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-semibold">Compress & Trim</p>
            <p className="text-xs text-muted-foreground">Reduce file size and clip videos</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={handlePickFile}
            className={cn(
              'w-full max-w-sm h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200',
              isDragging ? 'border-primary bg-primary/5 scale-[0.99]' : 'hover:border-primary/40 hover:bg-accent/40',
            )}
          >
            <div className={cn('p-5 rounded-2xl transition-colors', isDragging ? 'bg-primary/10' : 'bg-muted')}>
              <Upload className={cn('w-8 h-8', isDragging ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop video here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">MP4, MOV, AVI, MKV, WebM…</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Editor ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
        </div>
        {!isEditorMode && (
          <button onClick={() => { setSelectedFile(null); setFrames([]) }} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Resizable split — always */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">

          {/* Left: video + trim */}
          <ResizablePanel defaultSize={58} minSize={30}>
            <div className="flex flex-col h-full">
              {/* Video fills available height */}
              <div className="flex-1 bg-black min-h-0 relative">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="absolute inset-0 w-full h-full object-contain"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  preload="metadata"
                />
                <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center group">
                  <div className={cn('p-3 rounded-full bg-black/50 backdrop-blur-sm transition-opacity', isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100')}>
                    {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                  </div>
                </button>
              </div>

              {/* Trim bar pinned at bottom of left panel */}
              <div className="p-4 border-t shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5" /> Trim
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="tabular-nums text-muted-foreground">
                      Selected <span className="font-medium text-foreground">{formatTime(clipDuration)}</span> / {formatTime(duration)}
                    </span>
                    <button onClick={() => { setTrimStart(0); setTrimEnd(duration) }} className="text-primary hover:underline">
                      Reset
                    </button>
                  </div>
                </div>

                <TrimBar
                  duration={duration} start={trimStart} end={trimEnd}
                  currentTime={currentTime} frames={frames}
                  onChange={handleTrimChange} onSeek={handleSeek}
                />

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground shrink-0">Start</span>
                  <button onClick={() => handleTrimChange(Math.max(0, trimStart - 1), trimEnd)} className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0">−</button>
                  <span className="tabular-nums font-medium bg-muted px-2 py-1 rounded-md text-center w-14 shrink-0">{formatTime(trimStart)}</span>
                  <button onClick={() => handleTrimChange(Math.min(trimStart + 1, trimEnd - 0.25), trimEnd)} className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0">+</button>
                  <button
                    onClick={() => handleTrimChange(trimStart, currentTime > trimStart ? currentTime : trimEnd)}
                    className="flex-1 px-2 py-1 rounded-md border hover:bg-accent transition-colors text-center min-w-0"
                  >
                    Set end to playhead
                  </button>
                  <button onClick={() => handleTrimChange(trimStart, Math.max(trimEnd - 1, trimStart + 0.25))} className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0">−</button>
                  <span className="tabular-nums font-medium bg-muted px-2 py-1 rounded-md text-center w-14 shrink-0">{formatTime(trimEnd)}</span>
                  <button onClick={() => handleTrimChange(trimStart, Math.min(trimEnd + 1, duration))} className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0">+</button>
                  <span className="text-muted-foreground shrink-0">End</span>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: scrollable settings — @container for responsive grids */}
          <ResizablePanel defaultSize={42} minSize={25}>
            <div className="h-full overflow-y-auto p-5 flex flex-col gap-5 @container">

              {/* Quality */}
              <div className="space-y-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block">Quality</span>
                <div className="grid grid-cols-2 @xs:grid-cols-4 gap-2">
                  {QUALITY_PRESETS.map((p) => {
                    const est      = estimateSize(selectedFile.size, p.sizeRatio, scale, clipDuration, duration)
                    const selected = qualityKey === p.key
                    return (
                      <OptionButton key={p.key} selected={selected} onClick={() => setQualityKey(p.key)}>
                        <span className="text-sm font-bold">{p.label}</span>
                        <span className="text-xs text-muted-foreground leading-tight">{p.subtitle}</span>
                        <span className={cn('text-xs font-medium mt-0.5', selected ? 'text-primary' : 'text-muted-foreground')}>
                          ≈ {formatSize(est)}
                        </span>
                      </OptionButton>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Resolution */}
              <div className="space-y-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block">Resolution</span>
                <div className="grid grid-cols-2 @xs:grid-cols-4 gap-2">
                  {SCALES.map(({ label, value }) => {
                    const h = videoMeta.height > 0 ? Math.round(videoMeta.height * value / 2) * 2 : null
                    return (
                      <OptionButton key={value} selected={scale === value} onClick={() => setScale(value)}>
                        <span className="text-sm font-bold">{label}</span>
                        <span className="text-xs text-muted-foreground">{h ? `${h}p` : '—'}</span>
                      </OptionButton>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Format */}
              <div className="space-y-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block">Format</span>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={cn(
                        'py-2.5 text-sm border rounded-xl font-semibold uppercase tracking-wide transition-all',
                        format === fmt ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background hover:bg-accent',
                      )}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={submitting || duration === 0}>
                {submitting ? 'Adding…' : isEditorMode ? 'Trim & Compress' : 'Add to Queue'}
              </Button>

            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </div>
  )
}
