import type { BrowserWindow } from 'electron'
import fs from 'fs'
import type { Job, JobType, JobMetadata, CompressMetadata } from '../shared/types'
import { runCompress, buildOutputPath } from './compress'
import { getSettings } from './settings'
import type ffmpeg from 'fluent-ffmpeg'

const jobs = new Map<string, Job>()
const activeCommands = new Map<string, ffmpeg.FfmpegCommand>()
let runningCount = 0

function broadcast(win: BrowserWindow, job: Job): void {
  win.webContents.send('jobs:updated', job)
}

function updateJob(win: BrowserWindow, id: string, patch: Partial<Job>): Job {
  const job = jobs.get(id)!
  const updated = { ...job, ...patch }
  jobs.set(id, updated)
  broadcast(win, updated)
  return updated
}

function getOutputFormat(type: JobType, metadata: JobMetadata): string {
  if (type === 'compress') return (metadata as CompressMetadata).format
  return 'gif'
}

function maybeStartNext(win: BrowserWindow): void {
  const { maxParallelJobs } = getSettings()
  while (runningCount < maxParallelJobs) {
    const next = [...jobs.values()].find((j) => j.status === 'queued')
    if (!next) break
    startJob(win, next)
  }
}

async function startJob(win: BrowserWindow, job: Job): Promise<void> {
  runningCount++
  updateJob(win, job.id, { status: 'running' })

  try {
    if (job.type === 'compress') {
      await runCompress(
        job.inputPath,
        job.outputPath,
        job.metadata as CompressMetadata,
        (percent) => updateJob(win, job.id, { progress: percent }),
        (cmd) => activeCommands.set(job.id, cmd),
      )
      const outputSize = fs.statSync(job.outputPath).size
      updateJob(win, job.id, { status: 'done', progress: 100, outputSize, completedAt: Date.now() })
    }
  } catch (err) {
    const currentStatus = jobs.get(job.id)?.status
    if (currentStatus !== 'cancelled') {
      updateJob(win, job.id, {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
        completedAt: Date.now(),
      })
    }
  } finally {
    activeCommands.delete(job.id)
    runningCount--
    maybeStartNext(win)
  }
}

export function addJob(
  win: BrowserWindow,
  opts: { type: JobType; inputPath: string; inputSize: number; name: string; metadata: JobMetadata },
): Job {
  const settings = getSettings()
  const format = getOutputFormat(opts.type, opts.metadata)
  const outputPath = buildOutputPath(opts.inputPath, format, settings.outputDir)

  const job: Job = {
    id: crypto.randomUUID(),
    type: opts.type,
    name: opts.name,
    status: 'queued',
    progress: 0,
    inputPath: opts.inputPath,
    outputPath,
    inputSize: opts.inputSize,
    createdAt: Date.now(),
    metadata: opts.metadata,
  }

  jobs.set(job.id, job)
  broadcast(win, job)
  maybeStartNext(win)
  return job
}

export function cancelJob(win: BrowserWindow, id: string): void {
  const job = jobs.get(id)
  if (!job || ['done', 'error', 'cancelled'].includes(job.status)) return

  updateJob(win, id, { status: 'cancelled', completedAt: Date.now() })

  if (job.status === 'running') {
    activeCommands.get(id)?.kill('SIGKILL')
    activeCommands.delete(id)
    // runningCount-- and maybeStartNext handled in startJob's finally block
  }
}

export function getAllJobs(): Job[] {
  return [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt)
}

export function getRunningJobs(): Job[] {
  return [...jobs.values()].filter((j) => j.status === 'running' || j.status === 'queued')
}
