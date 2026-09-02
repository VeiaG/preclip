import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { IpcRendererEvent } from 'electron'
import type { Job, AppSettings, JobType, JobMetadata, ClipMark, GifDither, SteamMatch } from '../shared/types'

const api = {
  // Jobs
  addJob: (opts: {
    type: JobType
    inputPath: string
    inputSize: number
    name: string
    metadata: JobMetadata
  }): Promise<Job> => ipcRenderer.invoke('jobs:add', opts),

  cancelJob: (id: string): void => {
    ipcRenderer.send('jobs:cancel', id)
  },

  removeJob: (id: string): void => {
    ipcRenderer.send('jobs:remove', id)
  },

  clearFinishedJobs: (): void => {
    ipcRenderer.send('jobs:clearFinished')
  },

  getAllJobs: (): Promise<Job[]> => ipcRenderer.invoke('jobs:getAll'),

  onJobUpdated: (callback: (job: Job) => void): (() => void) => {
    const listener = (_: IpcRendererEvent, job: Job) => callback(job)
    ipcRenderer.on('jobs:updated', listener)
    return () => ipcRenderer.removeListener('jobs:updated', listener)
  },

  onJobRemoved: (callback: (id: string) => void): (() => void) => {
    const listener = (_: IpcRendererEvent, id: string) => callback(id)
    ipcRenderer.on('jobs:removed', listener)
    return () => ipcRenderer.removeListener('jobs:removed', listener)
  },

  // App
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', partial),

  // Files
  openVideoFile: (): Promise<{ path: string; name: string; size: number } | null> =>
    ipcRenderer.invoke('dialog:openFile'),

  openDir: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDir'),

  openImageFile: (): Promise<string | null> => ipcRenderer.invoke('dialog:openImage'),

  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  showInFolder: (filePath: string): void => {
    ipcRenderer.send('shell:showInFolder', filePath)
  },

  openPath: (p: string): void => {
    ipcRenderer.send('shell:openPath', p)
  },

  listDir: (dirPath: string): Promise<{ name: string; fullPath: string }[]> =>
    ipcRenderer.invoke('fs:listDir', dirPath),

  listGames: (dirPath: string): Promise<{ name: string; fullPath: string; videoCount: number; totalSize: number; lastModified: number }[]> =>
    ipcRenderer.invoke('fs:listGames', dirPath),

  listVideos: (dirPath: string): Promise<{ name: string; fullPath: string; size: number; modifiedAt: number }[]> =>
    ipcRenderer.invoke('fs:listVideos', dirPath),

  // Game covers
  getGameCover: (gameName: string): Promise<string | null> =>
    ipcRenderer.invoke('covers:get', gameName),
  hasCustomCover: (gameName: string): Promise<boolean> =>
    ipcRenderer.invoke('covers:hasCustom', gameName),
  setCustomCover: (gameName: string, sourcePath: string): Promise<string | null> =>
    ipcRenderer.invoke('covers:setCustom', gameName, sourcePath),
  setCustomCoverFromClipboard: (gameName: string): Promise<string | null> =>
    ipcRenderer.invoke('covers:setCustomFromClipboard', gameName),
  clearCustomCover: (gameName: string): Promise<string | null> =>
    ipcRenderer.invoke('covers:clearCustom', gameName),
  searchSteamCovers: (term: string): Promise<SteamMatch[]> =>
    ipcRenderer.invoke('covers:searchSteam', term),
  setSteamAppId: (gameName: string, appId: number): Promise<string | null> =>
    ipcRenderer.invoke('covers:setSteamId', gameName, appId),

  // Thumbnails
  getThumbnail: (videoPath: string): Promise<string | null> =>
    ipcRenderer.invoke('thumbnails:get', videoPath),
  clearThumbnailCache: (): Promise<void> => ipcRenderer.invoke('thumbnails:clearCache'),
  getThumbnailCacheSize: (): Promise<number> => ipcRenderer.invoke('thumbnails:cacheSize'),
  getThumbnailCacheDir: (): Promise<string> => ipcRenderer.invoke('thumbnails:cacheDir'),

  // Timeline frames
  getFrames: (videoPath: string, count: number): Promise<string[]> =>
    ipcRenderer.invoke('frames:get', videoPath, count),

  probeAudioTracks: (videoPath: string): Promise<number> =>
    ipcRenderer.invoke('probe:audioTracks', videoPath),

  // Clip marks
  getClipMarks: (filePaths: string[]): Promise<Record<string, ClipMark>> =>
    ipcRenderer.invoke('clipmarks:get', filePaths),

  // GIF preview
  getGifPreview: (
    videoPath: string,
    timeSec: number,
    opts: { width: number; colors: number; dither: GifDither },
  ): Promise<string | null> => ipcRenderer.invoke('gif:preview', videoPath, timeSec, opts),

  // Delete
  deleteFolder: (folderPath: string): Promise<void> => ipcRenderer.invoke('fs:deleteFolder', folderPath),
  deleteFiles: (filePaths: string[]): Promise<void> => ipcRenderer.invoke('fs:deleteFiles', filePaths),

  // Media server
  mediaPort: (): Promise<number> => ipcRenderer.invoke('media:port'),

  // Window controls
  windowControls: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (cb: (isMaximized: boolean) => void): (() => void) => {
      const listener = (_: IpcRendererEvent, val: boolean) => cb(val)
      ipcRenderer.on('window:maximized', listener)
      return () => ipcRenderer.removeListener('window:maximized', listener)
    },
  },

}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
