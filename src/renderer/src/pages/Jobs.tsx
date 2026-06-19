import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, CheckCircle2, AlertCircle, Clock, XCircle,
  FileVideo, ListChecks, X, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
// import { cn } from '@/lib/utils'
import { useJobs } from '@/context/JobsContext'
import type { Job, JobStatus } from '../../../shared/types'

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function StatusIcon({ status }: { status: JobStatus }) {
  if (status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
  if (status === 'queued')  return <Clock className="w-4 h-4 text-muted-foreground/60 shrink-0" />
  if (status === 'done')    return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
  if (status === 'error')   return <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
  return <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
}

interface JobRowProps {
  job: Job
  confirmingCancel: boolean
  onClick: () => void
  onCancel: (e: React.MouseEvent) => void
  onConfirmCancel: () => void
  onDismissCancel: () => void
}

function JobRow({ job, confirmingCancel, onClick, onCancel, onConfirmCancel, onDismissCancel }: JobRowProps) {
  const canCancel = job.status === 'running' || job.status === 'queued'
  const saving =
    job.outputSize && job.inputSize > 0
      ? Math.round((1 - job.outputSize / job.inputSize) * 100)
      : null

  return (
    <div
      className="px-4 py-3 hover:bg-accent/40 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <StatusIcon status={job.status} />

        {/* Name + secondary info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{job.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1 py-px shrink-0 leading-tight">
              {job.type}
            </span>
          </div>

          <div className="text-xs text-muted-foreground mt-0.5">
            {job.status === 'done' && saving !== null && (
              <span>
                {formatSize(job.inputSize)} → {formatSize(job.outputSize!)}
                <span className="text-green-600 dark:text-green-400 ml-1">−{saving}%</span>
              </span>
            )}
            {job.status === 'queued' && formatSize(job.inputSize)}
            {job.status === 'error' && (
              <span className="text-destructive truncate block">{job.error}</span>
            )}
            {job.status === 'cancelled' && 'Cancelled'}
          </div>
        </div>

        {/* Right — progress % or actions */}
        <div
          className="shrink-0 flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {job.status === 'running' && (
            <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">
              {Math.round(job.progress)}%
            </span>
          )}

          {confirmingCancel ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Cancel?</span>
              <Button size="sm" variant="destructive" className="h-6 px-2 text-xs" onClick={onConfirmCancel}>
                Yes
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onDismissCancel}>
                No
              </Button>
            </div>
          ) : (
            <>
              {canCancel && (
                <button
                  onClick={onCancel}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  title="Cancel (Shift+click to skip confirm)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
            </>
          )}
        </div>
      </div>

      {/* Progress bar — thin line, only when running */}
      {job.status === 'running' && (
        <div className="mt-2.5 h-0.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-150"
            style={{ width: `${job.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function Jobs() {
  const { jobs } = useJobs()
  const navigate = useNavigate()
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)

  const handleCancel = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (e.shiftKey) {
      window.api.cancelJob(jobId)
      return
    }
    setConfirmCancelId(jobId)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Jobs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Conversion queue for this session</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/compress')}>
          + New job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-5 rounded-2xl bg-muted">
            <ListChecks className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No jobs yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start a compression to see it here</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/compress')}>
            <FileVideo className="w-3.5 h-3.5 mr-1.5" />
            Compress a video
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y">
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              confirmingCancel={confirmCancelId === job.id}
              onClick={() => navigate(`/jobs/${job.id}`)}
              onCancel={(e) => handleCancel(job.id, e)}
              onConfirmCancel={() => { window.api.cancelJob(confirmCancelId!); setConfirmCancelId(null) }}
              onDismissCancel={() => setConfirmCancelId(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
