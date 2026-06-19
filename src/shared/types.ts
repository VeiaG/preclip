export type JobType = 'compress' | 'gif'
export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled'

export interface CompressMetadata {
  quality: number
  scale: number
  format: string
  trimStart?: number
  trimEnd?: number
}

export interface GifMetadata {
  fps: number
  width: number
}

export type JobMetadata = CompressMetadata | GifMetadata

export interface Job {
  id: string
  type: JobType
  name: string
  status: JobStatus
  progress: number
  inputPath: string
  outputPath: string
  inputSize: number
  outputSize?: number
  createdAt: number
  completedAt?: number
  error?: string
  metadata: JobMetadata
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  maxParallelJobs: number
  outputDir: string | null
  nvidiaCapturesPath: string | null
}
