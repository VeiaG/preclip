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

  listDir: (dirPath: string): Promise<{ name: string; fullPath: string }[]> =>
    ipcRenderer.invoke('fs:listDir', dirPath),

  // Media server
  mediaPort: (): Promise<number> => ipcRenderer.invoke('media:port'),

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
