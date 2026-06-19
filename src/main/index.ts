import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { addJob, cancelJob, getAllJobs, getRunningJobs } from './jobQueue'
import { getSettings, setSettings } from './settings'
import { generateThumbnail, clearThumbnailCache, getThumbnailCacheSize } from './thumbnails'
import { getGameCover } from './covers'

const MEDIA_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.wmv': 'video/x-ms-wmv',
}

// Local HTTP media server — avoids all Electron protocol.handle quirks.
// fs.createReadStream().pipe(res) handles backpressure correctly and has
// been battle-tested for video streaming for years.
let mediaServerPort = 0

const mediaServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Range')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length')

  if (!req.url || req.url === '/') {
    res.writeHead(400)
    res.end()
    return
  }

  const filePath = decodeURIComponent(req.url.slice(1))
  const contentType = MEDIA_MIME[path.extname(filePath).toLowerCase()] ?? 'video/mp4'

  let stat: fs.Stats
  try {
    stat = fs.statSync(filePath)
  } catch {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const fileSize = stat.size
  const rangeHeader = req.headers.range

  if (rangeHeader) {
    const startByte = parseInt(rangeHeader.match(/(\d+)-/)?.[1] ?? '0', 10)
    const endStr = rangeHeader.match(/-(\d+)/)?.[1]
    const endByte = endStr ? Math.min(parseInt(endStr, 10), fileSize - 1) : fileSize - 1

    if (startByte >= fileSize) {
      res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` })
      res.end()
      return
    }

    console.log(`[media] ${path.basename(filePath)} | ${startByte}-${endByte}/${fileSize}`)

    res.writeHead(206, {
      'Content-Range': `bytes ${startByte}-${endByte}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(endByte - startByte + 1),
      'Content-Type': contentType,
    })

    fs.createReadStream(filePath, { start: startByte, end: endByte }).pipe(res)
  } else {
    console.log(`[media] ${path.basename(filePath)} | full ${fileSize}`)

    res.writeHead(200, {
      'Content-Length': String(fileSize),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    })

    fs.createReadStream(filePath).pipe(res)
  }
})

mediaServer.listen(0, '127.0.0.1', () => {
  const addr = mediaServer.address()
  if (addr && typeof addr === 'object') {
    mediaServerPort = addr.port
    console.log(`[media-server] http://127.0.0.1:${mediaServerPort}`)
  }
})

let mainWindow: BrowserWindow

function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    minWidth: 600,
    minHeight: 480,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', async (e) => {
    const active = getRunningJobs()
    if (active.length === 0) return
    e.preventDefault()
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Quit Anyway'],
      defaultId: 0,
      cancelId: 0,
      message: `${active.length} job${active.length > 1 ? 's are' : ' is'} still running.`,
      detail: 'Quitting now will cancel all running conversions.',
    })
    if (response === 1) app.quit()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  // Jobs
  ipcMain.handle('jobs:add', (_, opts) => addJob(mainWindow, opts))
  ipcMain.on('jobs:cancel', (_, id: string) => cancelJob(mainWindow, id))
  ipcMain.handle('jobs:getAll', () => getAllJobs())

  // Settings
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_, partial) => setSettings(partial))

  // File system
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'] }],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    return { path: filePath, name: path.basename(filePath), size: fs.statSync(filePath).size }
  })

  ipcMain.handle('dialog:openDir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.on('shell:showInFolder', (_, filePath: string) => shell.showItemInFolder(filePath))

  ipcMain.handle('fs:listDir', (_, dirPath: string) => {
    const exts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv']
    return fs.readdirSync(dirPath)
      .filter(f => exts.includes(path.extname(f).toLowerCase()))
      .map(f => ({ name: f, fullPath: path.join(dirPath, f) }))
  })

  ipcMain.handle('fs:listGames', (_, dirPath: string) => {
    const videoExts = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv'])
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true })
    } catch {
      return []
    }
    return entries
      .filter(e => e.isDirectory())
      .map(dir => {
        const fullPath = path.join(dirPath, dir.name)
        let videoCount = 0
        let totalSize = 0
        try {
          for (const f of fs.readdirSync(fullPath)) {
            if (videoExts.has(path.extname(f).toLowerCase())) {
              videoCount++
              try { totalSize += fs.statSync(path.join(fullPath, f)).size } catch {}
            }
          }
        } catch {}
        return { name: dir.name, fullPath, videoCount, totalSize }
      })
      .filter(g => g.videoCount > 0)
  })

  ipcMain.handle('fs:listVideos', (_, dirPath: string) => {
    const videoExts = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv'])
    return fs.readdirSync(dirPath)
      .filter(f => videoExts.has(path.extname(f).toLowerCase()))
      .map(f => {
        const fullPath = path.join(dirPath, f)
        const stat = fs.statSync(fullPath)
        return { name: f, fullPath, size: stat.size, modifiedAt: stat.mtimeMs }
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
  })

  // Game covers (Steam art)
  ipcMain.handle('covers:get', (_, gameName: string) => getGameCover(gameName))

  // Thumbnails
  ipcMain.handle('thumbnails:get', async (_, videoPath: string) => {
    try { return await generateThumbnail(videoPath) } catch { return null }
  })
  ipcMain.handle('thumbnails:clearCache', () => clearThumbnailCache())
  ipcMain.handle('thumbnails:cacheSize', () => getThumbnailCacheSize())

  // Media server port — renderer fetches this once on load
  ipcMain.handle('media:port', () => mediaServerPort)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => mediaServer.close())
