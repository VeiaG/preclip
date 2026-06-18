import { useRef, useState } from 'react'
import { Upload, X, Play, FileVideo, FolderOpen, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'converting' | 'done'
const FORMATS = ['mp4', 'webm', 'mov'] as const
type Format = (typeof FORMATS)[number]
const SCALES = [
  { label: '1×', value: 1 },
  { label: '0.75×', value: 0.75 },
  { label: '0.5×', value: 0.5 },
  { label: '0.25×', value: 0.25 },
] as const

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function estimatedSize(original: number, quality: number, scale: number) {
  return original * (quality / 100) * scale * scale
}

export default function Compress() {
  const [file, setFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [quality, setQuality] = useState(75)
  const [scale, setScale] = useState(1)
  const [format, setFormat] = useState<Format>('mp4')

  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pickFile = (f: File) => {
    if (!f.type.startsWith('video/')) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setFile(f)
    setVideoUrl(URL.createObjectURL(f))
    setStatus('idle')
    setProgress(0)
    setDimensions(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    pickFile(e.dataTransfer.files[0])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) pickFile(f)
  }

  const handleMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget
    if (v.videoWidth) setDimensions({ w: v.videoWidth, h: v.videoHeight })
  }

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setFile(null)
    setVideoUrl(null)
    setDimensions(null)
    setStatus('idle')
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleConvert = () => {
    setStatus('converting')
    setProgress(0)
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(intervalRef.current!)
          setStatus('done')
          return 100
        }
        return Math.min(p + Math.random() * 4 + 1, 100)
      })
    }, 150)
  }

  const scaledRes = dimensions
    ? `${Math.round(dimensions.w * scale)}×${Math.round(dimensions.h * scale)}`
    : null

  const estSize = file && file.size > 0 ? estimatedSize(file.size, quality, scale) : 0
  const saving = file && file.size > 0 ? Math.round((1 - estSize / file.size) * 100) : 0
  const disabled = status !== 'idle'

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b">
        <h1 className="text-base font-semibold">Compress Video</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Reduce file size while keeping quality</p>
      </div>

      {!file ? (
        /* ── Drop zone ─────────────────────────────────── */
        <div className="flex-1 p-6">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-primary bg-primary/5 scale-[0.99]'
                : 'hover:border-primary/40 hover:bg-accent/40'
            )}
          >
            <div className={cn(
              'p-5 rounded-2xl transition-colors',
              isDragging ? 'bg-primary/10' : 'bg-muted'
            )}>
              <Upload className={cn('w-8 h-8 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop video here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">MP4, MOV, AVI, MKV, WebM...</p>
            </div>
            <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
      ) : (
        /* ── Resizable panels ───────────────────────────── */
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">

          {/* LEFT — preview */}
          <ResizablePanel defaultSize={67} minSize={40}>
            <div className="flex flex-col h-full p-5 gap-4">
              {/* Video */}
              <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                {videoUrl && (
                  <video
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    onLoadedMetadata={handleMetadata}
                    controls
                    muted
                  />
                )}
              </div>

              {/* File info */}
              <div className="flex items-center gap-3 px-1 shrink-0">
                <div className="p-1.5 rounded-md bg-muted shrink-0">
                  <FileVideo className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                    {dimensions && ` · ${dimensions.w}×${dimensions.h}`}
                  </p>
                </div>
                {!disabled && (
                  <button
                    onClick={reset}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT — settings */}
          <ResizablePanel defaultSize={33} minSize={25}>
            <div className="flex flex-col h-full overflow-y-auto">
              <div className="flex-1 p-5 space-y-6">

                {/* Quality */}
                <div className="space-y-3">
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
                    disabled={disabled}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Smaller file</span>
                    <span>Better quality</span>
                  </div>
                </div>

                <Separator />

                {/* Scale */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Scale</label>
                    {scaledRes && (
                      <span className="text-xs text-muted-foreground">{scaledRes}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SCALES.map(({ label, value }) => (
                      <button
                        key={value}
                        disabled={disabled}
                        onClick={() => setScale(value)}
                        className={cn(
                          'py-2 text-sm border rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                          scale === value
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background hover:bg-accent'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Format */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Format</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FORMATS.map((fmt) => (
                      <button
                        key={fmt}
                        disabled={disabled}
                        onClick={() => setFormat(fmt)}
                        className={cn(
                          'py-2 text-sm border rounded-lg font-medium uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                          format === fmt
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background hover:bg-accent'
                        )}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Estimated output */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estimated output</label>
                  <div className="rounded-xl border divide-y overflow-hidden">
                    <div className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Original</span>
                      <span className="font-medium">{formatSize(file.size)}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Output</span>
                      <span className="font-medium">{formatSize(estSize)}</span>
                    </div>
                    <div className="flex justify-between px-3 py-2 text-sm bg-muted/40">
                      <span className="text-muted-foreground">Saving</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ~{saving}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom — progress / action */}
              <div className="p-5 border-t space-y-3 shrink-0">
                {status === 'converting' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Converting...
                      </span>
                      <span className="font-semibold tabular-nums">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-150"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {status === 'done' && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="font-medium">
                      Done — saved {saving}% ({formatSize(file.size - estSize)})
                    </span>
                  </div>
                )}

                {status === 'idle' && (
                  <Button onClick={handleConvert} className="w-full" size="default">
                    <Play className="w-4 h-4 mr-2" />
                    Start Compression
                  </Button>
                )}

                {status === 'done' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                      Open folder
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={reset}>
                      Compress another
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  )
}
