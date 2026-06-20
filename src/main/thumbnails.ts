import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { app } from 'electron'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic.replace('app.asar', 'app.asar.unpacked'))
}

let cacheDir: string | null = null

function getCacheDir(): string {
  if (!cacheDir) {
    cacheDir = path.join(app.getPath('userData'), 'thumbnails')
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
  }
  return cacheDir
}

function thumbPath(videoPath: string): string {
  const hash = crypto.createHash('md5').update(videoPath).digest('hex')
  return path.join(getCacheDir(), `${hash}.jpg`)
}

let running = 0
const MAX = 2
const waiters: Array<() => void> = []
const inProgress = new Map<string, Promise<string>>()

async function withLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX) await new Promise<void>(r => waiters.push(r))
  running++
  try {
    return await fn()
  } finally {
    running--
    waiters.shift()?.()
  }
}

export async function generateThumbnail(videoPath: string): Promise<string> {
  const out = thumbPath(videoPath)
  if (fs.existsSync(out)) return out

  const existing = inProgress.get(out)
  if (existing) return existing

  const promise = withLimit<string>(async () => {
    if (fs.existsSync(out)) return out

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(1)
        .outputOptions(['-vframes', '1', '-vf', 'scale=320:-1', '-q:v', '3'])
        .output(out)
        //@ts-ignore
        .on('end', resolve)
        .on('error', (err) => {
          console.error('[thumbnail]', path.basename(videoPath), err.message)
          reject(err)
        })
        .run()
    })

    return out
  }).finally(() => inProgress.delete(out))

  inProgress.set(out, promise)
  return promise
}

export function clearThumbnailCache(): void {
  const dir = getCacheDir()
  for (const f of fs.readdirSync(dir)) {
    try { fs.rmSync(path.join(dir, f), { force: true }) } catch {}
  }
}

export function getThumbnailCacheDir(): string {
  return getCacheDir()
}

export function getThumbnailCacheSize(): number {
  const dir = getCacheDir()
  return fs.readdirSync(dir).reduce((total, f) => {
    try { return total + fs.statSync(path.join(dir, f)).size } catch { return total }
  }, 0)
}
