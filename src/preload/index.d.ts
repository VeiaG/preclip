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
  listGames: (dirPath: string) => Promise<{ name: string; fullPath: string; videoCount: number; totalSize: number }[]>
  listVideos: (dirPath: string) => Promise<{ name: string; fullPath: string; size: number; modifiedAt: number }[]>

  getGameCover: (gameName: string) => Promise<string | null>

  getThumbnail: (videoPath: string) => Promise<string | null>
  clearThumbnailCache: () => Promise<void>
  getThumbnailCacheSize: () => Promise<number>

  mediaPort: () => Promise<number>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: VideoKitAPI
  }
}
