import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Scissors, Play, Pause, FileVideo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const FORMATS = ['mp4', 'webm', 'mov'] as const
type Format = (typeof FORMATS)[number]

interface FileInfo {
  path: string
  name: string
  size: number
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

// ── Trim Bar ─────────────────────────────────────────────────────────────────

interface TrimBarProps {
  duration: number
  start: number
  end: number
  currentTime: number
  onChange: (start: number, end: number) => void
  onSeek: (time: number) => void
}

function TrimBar({ duration, start, end, currentTime, onChange, onSeek }: TrimBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<'start' | 'end' | null>(null)
  const startRef = useRef(start)
  const endRef = useRef(end)
  const durationRef = useRef(duration)
  const onChangeRef = useRef(onChange)

  useEffect(() => { startRef.current = start }, [start])
  useEffect(() => { endRef.current = end }, [end])
  useEffect(() => { durationRef.current = duration }, [duration])
  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  const timeFromX = useCallback((clientX: number) => {
    if (!barRef.current) return 0
    const rect = barRef.current.getBoundingClientRect()
    const p = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    return p * durationRef.current
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const t = timeFromX(e.clientX)
      const s = startRef.current
      const en = endRef.current
      if (dragRef.current === 'start') {
        onChangeRef.current(Math.min(t, en - 0.25), en)
      } else {
        onChangeRef.current(s, Math.max(t, s + 0.25))
      }
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [timeFromX])

  const pct = (t: number) => `${duration > 0 ? Math.min(Math.max((t / duration) * 100, 0), 100) : 0}%`

  const handleBarClick = (e: React.MouseEvent) => {
    if (dragRef.current) return
    onSeek(timeFromX(e.clientX))
  }

  return (
    <div
      ref={barRef}
      className="relative h-10 select-none cursor-pointer"
      onClick={handleBarClick}
    >
      {/* Track */}
      <div className="absolute inset-0 rounded-lg bg-muted overflow-hidden">
        {/* Excluded left */}
        <div
          className="absolute inset-y-0 left-0 bg-black/25"
          style={{ right: `${100 - parseFloat(pct(start))}%` }}
        />
        {/* Selected region */}
        <div
          className="absolute inset-y-0 bg-primary/20"
          style={{ left: pct(start), right: `${100 - parseFloat(pct(end))}%` }}
        />
        {/* Excluded right */}
        <div
          className="absolute inset-y-0 right-0 bg-black/25"
          style={{ left: pct(end) }}
        />
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/70 pointer-events-none"
          style={{ left: pct(currentTime) }}
        />
      </div>

      {/* Start handle */}
      <div
        className="absolute top-0 bottom-0 w-6 -translate-x-1/2 z-10 flex items-center justify-center cursor-ew-resize"
        style={{ left: pct(start) }}
        onMouseDown={(e) => { e.stopPropagation(); dragRef.current = 'start' }}
      >
        <div className="w-1.5 h-8 rounded bg-primary shadow-md" />
      </div>

      {/* End handle */}
      <div
        className="absolute top-0 bottom-0 w-6 -translate-x-1/2 z-10 flex items-center justify-center cursor-ew-resize"
        style={{ left: pct(end) }}
        onMouseDown={(e) => { e.stopPropagation(); dragRef.current = 'end' }}
      >
        <div className="w-1.5 h-8 rounded bg-primary shadow-md" />
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ClipEditor() {
  const navigate = useNavigate()
  const location = useLocation()
  const file = (location.state as { file?: FileInfo } | null)?.file ?? null

  const videoRef = useRef<HTMLVideoElement>(null)
  const [mediaPort, setMediaPort] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [quality, setQuality] = useState(75)
  const [format, setFormat] = useState<Format>('mp4')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.api.mediaPort().then(setMediaPort)
  }, [])

  const videoSrc =
    mediaPort && file
      ? `http://127.0.0.1:${mediaPort}/${encodeURIComponent(file.path)}`
      : undefined

  const handleLoadedMetadata = () => {
    const d = videoRef.current?.duration ?? 0
    setDuration(d)
    setTrimStart(0)
    setTrimEnd(d)
  }

  const handleTimeUpdate = () => {
    const t = videoRef.current?.currentTime ?? 0
    setCurrentTime(t)
    // Loop within trim region
    if (trimEnd > 0 && t >= trimEnd) {
      const v = videoRef.current
      if (v) { v.currentTime = trimStart; if (!v.paused) v.play() }
    }
  }

  const handleTrimChange = useCallback((start: number, end: number) => {
    setTrimStart(start)
    setTrimEnd(end)
  }, [])

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time
  }, [])

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

  const handleSubmit = async () => {
    if (!file || submitting) return
    setSubmitting(true)
    try {
      const isFullClip = trimStart <= 0.1 && trimEnd >= duration - 0.1
      await window.api.addJob({
        type: 'compress',
        inputPath: file.path,
        inputSize: file.size,
        name: file.name,
        metadata: {
          quality,
          scale: 1,
          format,
          trimStart: isFullClip ? undefined : trimStart,
          trimEnd: isFullClip ? undefined : trimEnd,
        },
      })
      navigate('/jobs')
    } finally {
      setSubmitting(false)
    }
  }

  if (!file) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <FileVideo className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">No video selected</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/hub')}>
          Back to Library
        </Button>
      </div>
    )
  }

  const clipDuration = trimEnd - trimStart

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Video player */}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video w-full max-h-52 shrink-0">
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            preload="metadata"
          />
          {/* Play/Pause overlay */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center group"
          >
            <div className={cn(
              'p-3 rounded-full bg-black/50 backdrop-blur-sm transition-opacity',
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100',
            )}>
              {isPlaying
                ? <Pause className="w-5 h-5 text-white" />
                : <Play className="w-5 h-5 text-white" />
              }
            </div>
          </button>
        </div>

        {/* Trim Section */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5" />
              Trim
            </label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(clipDuration)} / {formatTime(duration)}
            </span>
          </div>

          <TrimBar
            duration={duration}
            start={trimStart}
            end={trimEnd}
            currentTime={currentTime}
            onChange={handleTrimChange}
            onSeek={handleSeek}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span className="bg-muted px-2 py-0.5 rounded font-medium text-foreground">
              {formatTime(trimStart)}
            </span>
            <span className="text-muted-foreground">
              clip: {formatTime(clipDuration)}
            </span>
            <span className="bg-muted px-2 py-0.5 rounded font-medium text-foreground">
              {formatTime(trimEnd)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Quality */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Quality</label>
            <span className="text-sm font-semibold tabular-nums bg-muted px-2 py-0.5 rounded-md">
              {quality}%
            </span>
          </div>
          <Slider
            defaultValue={[quality]}
            onValueChange={(v) => setQuality(Array.isArray(v) ? v[0] : v)}
            min={10}
            max={100}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Smaller file</span>
            <span>Better quality</span>
          </div>
        </div>

        <Separator />

        {/* Format */}
        <div className="space-y-3 shrink-0">
          <label className="text-sm font-medium">Format</label>
          <div className="grid grid-cols-3 gap-1.5">
            {FORMATS.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={cn(
                  'py-2 text-sm border rounded-lg font-medium uppercase transition-colors',
                  format === fmt
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background hover:bg-accent',
                )}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSubmit} className="w-full shrink-0" disabled={submitting || duration === 0}>
          <Scissors className="w-4 h-4 mr-2" />
          {submitting ? 'Adding…' : 'Trim & Compress'}
        </Button>
      </div>
    </div>
  )
}
