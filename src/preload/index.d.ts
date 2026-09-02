import { ElectronAPI } from '@electron-toolkit/preload'
import type { Job, AppSettings, JobType, JobMetadata, ClipMark, GifDither, SteamMatch } from '../shared/types'

interface VideoKitAPI {
  addJob: (opts: {
    type: JobType
    inputPath: string
    inputSize: number
    name: string
    metadata: JobMetadata
  }) => Promise<Job>
  cancelJob: (id: string) => void
  removeJob: (id: string) => void
  clearFinishedJobs: () => void
  getAllJobs: () => Promise<Job[]>
  onJobUpdated: (callback: (job: Job) => void) => () => void
  onJobRemoved: (callback: (id: string) => void) => () => void

  getSettings: () => Promise<AppSettings>
  setSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>

  openVideoFile: () => Promise<{ path: string; name: string; size: number } | null>
  openDir: () => Promise<string | null>
  openImageFile: () => Promise<string | null>
  getPathForFile: (file: File) => string
  showInFolder: (filePath: string) => void
  openPath: (p: string) => void
  listDir: (dirPath: string) => Promise<{ name: string; fullPath: string }[]>
  listGames: (dirPath: string) => Promise<{ name: string; fullPath: string; videoCount: number; totalSize: number; lastModified: number }[]>
  listVideos: (dirPath: string) => Promise<{ name: string; fullPath: string; size: number; modifiedAt: number }[]>

  getGameCover: (gameName: string) => Promise<string | null>
  hasCustomCover: (gameName: string) => Promise<boolean>
  setCustomCover: (gameName: string, sourcePath: string) => Promise<string | null>
  setCustomCoverFromClipboard: (gameName: string) => Promise<string | null>
  clearCustomCover: (gameName: string) => Promise<string | null>
  searchSteamCovers: (term: string) => Promise<SteamMatch[]>
  setSteamAppId: (gameName: string, appId: number) => Promise<string | null>

  getThumbnail: (videoPath: string) => Promise<string | null>
  clearThumbnailCache: () => Promise<void>
  getThumbnailCacheSize: () => Promise<number>
  getThumbnailCacheDir: () => Promise<string>

  getFrames: (videoPath: string, count: number) => Promise<string[]>
  probeAudioTracks: (videoPath: string) => Promise<number>

  getClipMarks: (filePaths: string[]) => Promise<Record<string, ClipMark>>
  getGifPreview: (
    videoPath: string,
    timeSec: number,
    opts: { width: number; colors: number; dither: GifDither },
  ) => Promise<string | null>

  deleteFolder: (folderPath: string) => Promise<void>
  deleteFiles: (filePaths: string[]) => Promise<void>

  mediaPort: () => Promise<number>

  windowControls: {
    minimize: () => void
    maximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizeChange: (cb: (isMaximized: boolean) => void) => () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: VideoKitAPI
  }
}
