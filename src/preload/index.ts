import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { IpcRendererEvent } from 'electron'
import type { Job, AppSettings, JobType, JobMetadata } from '../shared/types'

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

  getAllJobs: (): Promise<Job[]> => ipcRenderer.invoke('jobs:getAll'),

  onJobUpdated: (callback: (job: Job) => void): (() => void) => {
    const listener = (_: IpcRendererEvent, job: Job) => callback(job)
    ipcRenderer.on('jobs:updated', listener)
    return () => ipcRenderer.removeListener('jobs:updated', listener)
  },

  // Settings
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', partial),

  // Files
  openVideoFile: (): Promise<{ path: string; name: string; size: number } | null> =>
    ipcRenderer.invoke('dialog:openFile'),

  openDir: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDir'),

  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  showInFolder: (filePath: string): void => {
    ipcRenderer.send('shell:showInFolder', filePath)
  },

  openPath: (p: string): void => {
    ipcRenderer.send('shell:openPath', p)
  },

  listDir: (dirPath: string): Promise<{ name: string; fullPath: string }[]> =>
    ipcRenderer.invoke('fs:listDir', dirPath),

  listGames: (dirPath: string): Promise<{ name: string; fullPath: string; videoCount: number; totalSize: number }[]> =>
    ipcRenderer.invoke('fs:listGames', dirPath),

  listVideos: (dirPath: string): Promise<{ name: string; fullPath: string; size: number; modifiedAt: number }[]> =>
    ipcRenderer.invoke('fs:listVideos', dirPath),

  // Game covers
  getGameCover: (gameName: string): Promise<string | null> =>
    ipcRenderer.invoke('covers:get', gameName),

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
