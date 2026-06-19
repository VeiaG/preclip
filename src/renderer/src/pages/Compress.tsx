import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Play, FileVideo, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

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

interface PickedFile {
  path: string
  name: string
  size: number
}

export default function Compress() {
  const navigate = useNavigate()
  const [file, setFile] = useState<PickedFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [quality, setQuality] = useState(75)
  const [scale, setScale] = useState(1)
  const [format, setFormat] = useState<Format>('mp4')
  const [submitting, setSubmitting] = useState(false)

  const pickFile = (f: PickedFile) => setFile(f)

  const handleClickZone = async () => {
    const result = await window.api.openVideoFile()
    if (result) pickFile(result)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (!f || !f.type.startsWith('video/')) return
    pickFile({ path: window.api.getPathForFile(f), name: f.name, size: f.size })
  }

  const handleSubmit = async () => {
    if (!file || submitting) return
    setSubmitting(true)
    try {
      await window.api.addJob({
        type: 'compress',
        inputPath: file.path,
        inputSize: file.size,
        name: file.name,
        metadata: { quality, scale, format },
      })
      navigate('/jobs')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b">
        <h1 className="text-base font-semibold">Compress Video</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Reduce file size while keeping quality</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onClick={handleClickZone}
            className={cn(
              'h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200',
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
        ) : (
          <div className="space-y-6">
            {/* Selected file */}
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
              <div className="p-1.5 rounded-md bg-muted shrink-0">
                <FileVideo className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Smaller file</span>
                <span>Better quality</span>
              </div>
            </div>

            <Separator />

            {/* Scale */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Scale</label>
              <div className="grid grid-cols-4 gap-1.5">
                {SCALES.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setScale(value)}
                    className={cn(
                      'py-2 text-sm border rounded-lg font-medium transition-colors',
                      scale === value
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background hover:bg-accent',
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

            <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
              <Play className="w-4 h-4 mr-2" />
              Add to Queue
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
