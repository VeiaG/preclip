import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, CheckCircle2, AlertCircle, Clock, XCircle,
  FolderOpen, X, FileVideo, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
import { cn } from '@/lib/utils'
import { useJobs } from '@/context/JobsContext'
import type { Job, JobStatus, CompressMetadata } from '../../../shared/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(bytes: number) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576)     return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString()
}

function useIsWide(breakpoint = 1024) {
  const [isWide, setIsWide] = useState(() => window.innerWidth >= breakpoint)
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isWide
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<JobStatus, { icon: React.ElementType; label: string; className: string }> = {
  running:   { icon: Loader2,      label: 'Converting',     className: 'text-primary' },
  queued:    { icon: Clock,        label: 'Queued',          className: 'text-muted-foreground' },
  done:      { icon: CheckCircle2, label: 'Done',            className: 'text-green-500' },
  error:     { icon: AlertCircle,  label: 'Error',           className: 'text-destructive' },
  cancelled: { icon: XCircle,      label: 'Cancelled',       className: 'text-muted-foreground' },
}

function StatusBadge({ status }: { status: JobStatus }) {
  const { icon: Icon, label, className } = STATUS_CONFIG[status]
  return (
    <div className={cn('flex items-center gap-1.5 text-xs font-medium', className)}>
      <Icon className={cn('w-3.5 h-3.5', status === 'running' && 'animate-spin')} />
      {label}
    </div>
  )
}

// ── Video preview ─────────────────────────────────────────────────────────────

function VideoPreview({ src, status, progress }: { src: string; status: JobStatus; progress: number }) {
  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video src={src} className="w-full h-full object-contain" controls preload="metadata" muted />

      {status === 'running' && (
        <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <div className="flex items-end gap-1.5 h-10">
            {[0.5, 0.8, 1, 0.65, 0.9, 0.55, 0.75].map((h, i) => (
              <div key={i} className="w-1.5 rounded-full bg-white animate-pulse" style={{ height: `${h * 40}px`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <p className="text-white text-3xl font-bold tabular-nums">{Math.round(progress)}%</p>
          <div className="w-36 h-0.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === 'queued' && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <Clock className="w-8 h-8 text-white/50" />
          <p className="text-white/50 text-sm">Waiting in queue</p>
        </div>
      )}

      {status === 'done' && (
        <div className="absolute top-2.5 right-2.5 bg-green-500 rounded-full p-1 shadow pointer-events-none">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 bg-red-950/50 flex items-center justify-center pointer-events-none">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
      )}

      {status === 'cancelled' && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
          <XCircle className="w-10 h-10 text-muted-foreground/60" />
        </div>
      )}
    </div>
  )
}

// ── Stat cards ────────────────────────────────────────────────────────────────

function StatCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 px-3 py-4 text-center space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold', className)}>{value}</p>
    </div>
  )
}

// ── Sheet detail row ──────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start px-4 py-2.5 text-sm gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right break-all">{value}</span>
    </div>
  )
}

// ── Cancel section ────────────────────────────────────────────────────────────

function CancelSection({ job }: { job: Job }) {
  const [confirming, setConfirming] = useState(false)
  if (job.status !== 'running' && job.status !== 'queued') return null

  return confirming ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground flex-1">Cancel this job?</span>
      <Button size="sm" variant="destructive" onClick={() => { window.api.cancelJob(job.id); setConfirming(false) }}>
        Yes, cancel
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Keep</Button>
    </div>
  ) : (
    <Button
      variant="outline" size="sm" className="w-full text-muted-foreground"
      onClick={(e) => { if (e.shiftKey) { window.api.cancelJob(job.id); return }; setConfirming(true) }}
    >
      <X className="w-3.5 h-3.5 mr-1.5" /> Cancel job
    </Button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobDetail() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { jobs }  = useJobs()
  const job       = jobs.find((j) => j.id === id)
  const isWide    = useIsWide()
  const [mediaPort, setMediaPort] = useState(0)

  useEffect(() => { window.api.mediaPort().then(setMediaPort) }, [])

  if (!job) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <FileVideo className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">Job not found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/jobs')}>Back to Jobs</Button>
      </div>
    )
  }

  const metadata = job.metadata as CompressMetadata

  // Saving: positive = output smaller (good), negative = output larger
  const savingPct =
    job.outputSize && job.inputSize > 0
      ? Math.round((1 - job.outputSize / job.inputSize) * 100)
      : null

  const videoPath = job.status === 'done' ? job.outputPath : job.inputPath
  const videoSrc  = mediaPort ? `http://127.0.0.1:${mediaPort}/${encodeURIComponent(videoPath)}` : ''

  // ── Shared elements ─────────────────────────────────────────────────────────

  const headerEl = (
    <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
      <button
        onClick={() => navigate('/jobs')}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{job.name}</p>
        <StatusBadge status={job.status} />
      </div>

      {job.status === 'done' && (
        <button
          onClick={() => window.api.showInFolder(job.outputPath)}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="Show in folder"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
      )}

      <Sheet>
        <SheetTrigger
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Details"
        >
          <Info className="w-4 h-4" />
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader><SheetTitle>Job details</SheetTitle></SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">Settings</p>
              <div className="divide-y border-y">
                <DetailRow label="Quality"  value={`${metadata.quality}%`} />
                <DetailRow label="Scale"    value={`${metadata.scale}×`} />
                <DetailRow label="Format"   value={metadata.format?.toUpperCase()} />
                {metadata.trimStart !== undefined && (
                  <DetailRow label="Trim start" value={`${metadata.trimStart?.toFixed(2)}s`} />
                )}
                {metadata.trimEnd !== undefined && (
                  <DetailRow label="Trim end" value={`${metadata.trimEnd?.toFixed(2)}s`} />
                )}
              </div>
            </div>
            <div className="py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">Files</p>
              <div className="divide-y border-y">
                <DetailRow label="Input"     value={job.inputPath} />
                <DetailRow label="Output"    value={job.outputPath} />
                <DetailRow label="Started"   value={formatDate(job.createdAt)} />
                {job.completedAt && <DetailRow label="Completed" value={formatDate(job.completedAt)} />}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )

  const infoEl = (
    <div className="flex flex-col gap-5">
      {/* Size stats */}
      {job.status === 'done' && job.outputSize && savingPct !== null && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Original" value={formatSize(job.inputSize)} />
          <StatCard label="Output"   value={formatSize(job.outputSize)} />
          <StatCard
            label={savingPct >= 0 ? 'Saved' : 'Grew'}
            value={savingPct >= 0 ? `−${savingPct}%` : `+${Math.abs(savingPct)}%`}
            className={savingPct > 0 ? 'text-green-600 dark:text-green-400' : savingPct < 0 ? 'text-amber-500' : 'text-muted-foreground'}
          />
        </div>
      )}

      {/* Error */}
      {job.status === 'error' && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {job.error}
        </div>
      )}

      {/* Progress bar when running */}
      {job.status === 'running' && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Converting…</span>
            <span className="tabular-nums font-medium">{Math.round(job.progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-200" style={{ width: `${job.progress}%` }} />
          </div>
        </div>
      )}

      <Separator />

      {/* Settings summary */}
      <div className="space-y-2">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground block">Settings</span>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {[
            { label: 'Quality', value: `${metadata.quality}%` },
            { label: 'Scale',   value: `${metadata.scale}×` },
            { label: 'Format',  value: metadata.format?.toUpperCase() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border bg-muted/30 px-3 py-3 text-center space-y-0.5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <CancelSection job={job} />
    </div>
  )

  // ── Wide layout ─────────────────────────────────────────────────────────────

  if (isWide) {
    return (
      <div className="flex flex-col h-full">
        {headerEl}
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={60} minSize={35}>
              <div className="h-full bg-black">
                {videoSrc && <VideoPreview src={videoSrc} status={job.status} progress={job.progress} />}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={40} minSize={28}>
              <div className="h-full overflow-y-auto p-5">
                {infoEl}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    )
  }

  // ── Narrow layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {headerEl}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Video with aspect ratio */}
        <div className="relative bg-black aspect-video w-full max-h-64 shrink-0">
          {videoSrc && <VideoPreview src={videoSrc} status={job.status} progress={job.progress} />}
        </div>
        <div className="p-5 flex flex-col gap-5">
          {infoEl}
        </div>
      </div>
    </div>
  )
}
