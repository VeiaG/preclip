import { ElectronAPI } from '@electron-toolkit/preload'
import type { Job, AppSettings, JobType, JobMetadata } from '../shared/types'

interface VideoKitAPI {
  addJob: (opts: {
    type: JobType
    inputPath: string
    inputSize: number
    name: string
    metadata: JobMetadata
  }) => Promise<Job>
  cancelJob: (id: string) => void
  getAllJobs: () => Promise<Job[]>
  onJobUpdated: (callback: (job: Job) => void) => () => void

  getSettings: () => Promise<AppSettings>
  setSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>

  openVideoFile: () => Promise<{ path: string; name: string; size: number } | null>
  openDir: () => Promise<string | null>
  getPathForFile: (file: File) => string
  showInFolder: (filePath: string) => void
  listDir: (dirPath: string) => Promise<{ name: string; fullPath: string }[]>

  mediaPort: () => Promise<number>
  hasFaststart: (filePath: string) => Promise<boolean>
  remuxFaststart: (inputPath: string, outputPath: string) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: VideoKitAPI
  }
}
