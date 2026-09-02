export type JobType = 'compress' | 'gif'
export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled'

export interface CompressMetadata {
  quality: number
  scale: number
  format: string
  trimStart?: number
  trimEnd?: number
  mergeAudioTracks?: boolean
  audioTrackCount?: number
}

export type GifDither = 'none' | 'bayer' | 'sierra2_4a'

export interface GifMetadata {
  fps: number
  width: number // 0 = keep original width
  colors: number
  dither: GifDither
  loop: boolean // true = loop forever
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

/** Which page the app opens on. Values are router paths. */
export type StartPage = '/hub' | '/' | '/compress' | '/jobs'

export interface AppSettings {
  maxParallelJobs: number
  outputDir: string | null
  nvidiaCapturesPath: string | null
  startPage: StartPage
}

/** How a file in the library was produced. `null` = untouched original. */
export type ClipMark = 'clip' | 'gif' | null

/** One candidate from Steam's store search, used to re-match a game folder. */
export interface SteamMatch {
  appId: number
  name: string
}
