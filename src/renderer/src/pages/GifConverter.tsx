import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Upload, X, Clapperboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { cn, formatSize } from '@/lib/utils'
import type { GifDither } from '../../../shared/types'

// ── Types & options ───────────────────────────────────────────────────────────

interface FileInfo {
  path: string
  name: string
  size: number
}

const FPS_OPTIONS = [10, 15, 20, 25]

/** `0` keeps the source width. */
const WIDTH_OPTIONS = [
  { label: '320', value: 320 },
  { label: '480', value: 480 },
  { label: '640', value: 640 },
  { label: 'Source', value: 0 },
] as const

const COLOR_OPTIONS = [32, 64, 128, 256]

const DITHER_OPTIONS: { value: GifDither; label: string; subtitle: string }[] = [
  { value: 'sierra2_4a', label: 'Sierra', subtitle: 'Smoothest' },
  { value: 'bayer', label: 'Bayer', subtitle: 'Smaller' },
  { value: 'none', label: 'None', subtitle: 'Flat' },
]

/** Past this, a GIF gets big fast — worth saying so out loud. */
const LONG_CLIP_SECONDS = 15

const PREVIEW_DEBOUNCE_MS = 400

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

// ── OptionButton ──────────────────────────────────────────────────────────────

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
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

export default function GifConverter() {
  const navigate = useNavigate()
  const location = useLocation()
  const stateFile = (location.state as { file?: FileInfo } | null)?.file ?? null

  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(stateFile)
  const [isDragging, setIsDragging] = useState(false)
  const [mediaPort, setMediaPort] = useState(0)

  const [duration, setDuration] = useState(0)
  const [videoMeta, setVideoMeta] = useState({ width: 0, height: 0 })
  const [previewTime, setPreviewTime] = useState(0)

  const [fps, setFps] = useState(15)
  const [width, setWidth] = useState<number>(480)
  const [colors, setColors] = useState(128)
  const [dither, setDither] = useState<GifDither>('sierra2_4a')
  const [loop, setLoop] = useState(true)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    window.api.mediaPort().then(setMediaPort)
  }, [])

  const videoSrc =
    mediaPort && selectedFile
      ? `http://127.0.0.1:${mediaPort}/${encodeURIComponent(selectedFile.path)}`
      : undefined

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    setDuration(v.duration)
    setVideoMeta({ width: v.videoWidth, height: v.videoHeight })
    // Opening frames are often black on game captures.
    setPreviewTime(v.duration * 0.25)
  }

  // Render the preview through the real palette pipeline, debounced so dragging
  // the position slider doesn't spawn an ffmpeg run per pixel.
  const previewToken = useRef(0)

  useEffect(() => {
    if (!selectedFile || !mediaPort || duration === 0) return
    const token = ++previewToken.current
    setPreviewLoading(true)

    const timer = setTimeout(() => {
      window.api
        .getGifPreview(selectedFile.path, previewTime, { width, colors, dither })
        .then((framePath) => {
          if (token !== previewToken.current) return
          setPreviewUrl(
            framePath ? `http://127.0.0.1:${mediaPort}/${encodeURIComponent(framePath)}` : null,
          )
          setPreviewLoading(false)
        })
        .catch(() => {
          if (token !== previewToken.current) return
          setPreviewUrl(null)
          setPreviewLoading(false)
        })
    }, PREVIEW_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [selectedFile, mediaPort, duration, previewTime, width, colors, dither])

  const reset = useCallback(() => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setDuration(0)
    setVideoMeta({ width: 0, height: 0 })
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
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
      await window.api.addJob({
        type: 'gif',
        inputPath: selectedFile.path,
        inputSize: selectedFile.size,
        name: selectedFile.name,
        metadata: { fps, width, colors, dither, loop },
      })
      navigate('/jobs')
    } finally {
      setSubmitting(false)
    }
  }

  // ── File picker ─────────────────────────────────────────────────────────────
  if (!selectedFile) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-3.5 border-b flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-semibold">GIF Converter</p>
            <p className="text-xs text-muted-foreground">Turn a clip into an animated GIF</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onClick={handlePickFile}
            className={cn(
              'w-full max-w-sm h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-primary bg-primary/5 scale-[0.99]'
                : 'hover:border-primary/40 hover:bg-accent/40',
            )}
          >
            <div
              className={cn(
                'p-5 rounded-2xl transition-colors',
                isDragging ? 'bg-primary/10' : 'bg-muted',
              )}
            >
              <Upload className={cn('w-8 h-8', isDragging ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop video here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                Trim it first in the editor if you only need part of it
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Converter ───────────────────────────────────────────────────────────────
  const outWidth = width > 0 ? width : videoMeta.width
  const outHeight =
    videoMeta.width > 0 && outWidth > 0
      ? Math.round((videoMeta.height * outWidth) / videoMeta.width)
      : 0
  const frameCount = Math.round(duration * fps)
  const isLong = duration > LONG_CLIP_SECONDS

  return (
    <div className="flex flex-col h-full">
      {/* Hidden — only there to report duration and dimensions. */}
      <video
        src={videoSrc}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatSize(selectedFile.size)} &bull; {formatTime(duration)}
          </p>
        </div>
        {!stateFile && (
          <button
            onClick={reset}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          {/* Left: single-frame preview */}
          <ResizablePanel defaultSize="58%" minSize="40%">
            <div className="flex flex-col h-full">
              <div className="flex-1 bg-black min-h-0 relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Clapperboard className="w-10 h-10 text-white/20" />
                  </div>
                )}
                {previewLoading && (
                  <div className="absolute top-3 right-3 text-[11px] font-medium text-white/70 bg-black/60 rounded-md px-2 py-1">
                    Rendering…
                  </div>
                )}
              </div>

              <div className="p-4 border-t shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                    Preview frame
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatTime(previewTime)} / {formatTime(duration)}
                  </span>
                </div>
                <Slider
                  value={[previewTime]}
                  onValueChange={(v) => setPreviewTime(Array.isArray(v) ? v[0] : v)}
                  min={0}
                  max={Math.max(duration, 0.1)}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  Rendered with the palette and size below, so the colours match the final GIF.
                </p>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: GIF settings */}
          <ResizablePanel defaultSize="42%" minSize="28%" maxSize="60%">
            <div className="h-full overflow-y-auto p-5 flex flex-col gap-5 @container">
              {/* Frame rate */}
              <div className="space-y-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block">
                  Frame rate
                </span>
                <div className="grid grid-cols-2 @xs:grid-cols-4 gap-2">
                  {FPS_OPTIONS.map((value) => (
                    <OptionButton key={value} selected={fps === value} onClick={() => setFps(value)}>
                      <span className="text-sm font-bold">{value}</span>
                      <span className="text-xs text-muted-foreground">fps</span>
                    </OptionButton>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Width */}
              <div className="space-y-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block">
                  Width
                </span>
                <div className="grid grid-cols-2 @xs:grid-cols-4 gap-2">
                  {WIDTH_OPTIONS.map(({ label, value }) => (
                    <OptionButton
                      key={value}
                      selected={width === value}
                      onClick={() => setWidth(value)}
                    >
                      <span className="text-sm font-bold">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {value === 0 ? (videoMeta.width ? `${videoMeta.width}px` : '—') : 'px'}
                      </span>
                    </OptionButton>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Colours */}
              <div className="space-y-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block">
                  Colours
                </span>
                <div className="grid grid-cols-2 @xs:grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map((value) => (
                    <OptionButton
                      key={value}
                      selected={colors === value}
                      onClick={() => setColors(value)}
                    >
                      <span className="text-sm font-bold">{value}</span>
                      <span className="text-xs text-muted-foreground">
                        {value === 256 ? 'max' : value <= 32 ? 'tiny' : 'colours'}
                      </span>
                    </OptionButton>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Dither */}
              <div className="space-y-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block">
                  Dither
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {DITHER_OPTIONS.map(({ value, label, subtitle }) => (
                    <OptionButton
                      key={value}
                      selected={dither === value}
                      onClick={() => setDither(value)}
                    >
                      <span className="text-sm font-bold">{label}</span>
                      <span className="text-xs text-muted-foreground">{subtitle}</span>
                    </OptionButton>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Loop */}
              <div className="space-y-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block">
                  Playback
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <OptionButton selected={loop} onClick={() => setLoop(true)}>
                    <span className="text-sm font-bold">Loop</span>
                    <span className="text-xs text-muted-foreground">Repeat forever</span>
                  </OptionButton>
                  <OptionButton selected={!loop} onClick={() => setLoop(false)}>
                    <span className="text-sm font-bold">Play once</span>
                    <span className="text-xs text-muted-foreground">Stop at the end</span>
                  </OptionButton>
                </div>
              </div>

              <div className="rounded-xl border px-3 py-2.5 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Output</span>
                  <span className="tabular-nums text-foreground">
                    {outWidth > 0 ? `${outWidth}×${outHeight}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Frames</span>
                  <span className="tabular-nums text-foreground">
                    {frameCount > 0 ? frameCount : '—'}
                  </span>
                </div>
                {isLong && (
                  <p className="pt-1 text-destructive">
                    {formatTime(duration)} is long for a GIF — trim it in the editor first if the
                    file comes out too big.
                  </p>
                )}
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={submitting || duration === 0}>
                {submitting ? 'Adding…' : 'Convert to GIF'}
              </Button>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
