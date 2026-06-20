import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { app } from 'electron'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic.replace('app.asar', 'app.asar.unpacked'))
}
if (ffprobeStatic?.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path.replace('app.asar', 'app.asar.unpacked'))
}

let cacheDir: string | null = null

function getCacheDir(): string {
  if (!cacheDir) {
    cacheDir = path.join(app.getPath('userData'), 'frames')
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
  }
  return cacheDir
}

export function clearFramesCache(): void {
  const dir = getCacheDir()
  try {
    for (const entry of fs.readdirSync(dir)) {
      try { fs.rmSync(path.join(dir, entry), { force: true, recursive: true }) } catch {}
    }
  } catch {}
}

const inProgress = new Map<string, Promise<string[]>>()

export async function generateFrames(videoPath: string, count: number = 20): Promise<string[]> {
  const hash = crypto.createHash('md5').update(`${videoPath}:${count}`).digest('hex')
  const dir = path.join(getCacheDir(), hash)

  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort()
    if (files.length >= count) return files.slice(0, count).map(f => path.join(dir, f))
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
  }

  const existing = inProgress.get(hash)
  if (existing) return existing

  const promise = (async (): Promise<string[]> => {
    fs.mkdirSync(dir, { recursive: true })

    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, meta) => {
        if (err) reject(err)
        else resolve(meta.format.duration ?? 0)
      })
    })

    if (duration <= 0) return []

    const step = duration / count
    const tasks = Array.from({ length: count }, (_, i) => {
      const time = Math.min(i * step + step / 2, duration - 0.1)
      const outPath = path.join(dir, `frame_${i.toString().padStart(3, '0')}.jpg`)

      return (): Promise<void> => new Promise(resolve => {
        ffmpeg(videoPath)
          .seekInput(time)
          .outputOptions(['-vframes', '1', '-vf', 'scale=120:-1', '-q:v', '5'])
          .output(outPath)
          // @ts-ignore
          .on('end', resolve)
          .on('error', () => resolve())
          .run()
      })
    })

    for (let i = 0; i < tasks.length; i += 4) {
      await Promise.all(tasks.slice(i, i + 4).map(fn => fn()))
    }

    return fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort().map(f => path.join(dir, f))
  })().finally(() => inProgress.delete(hash))

  inProgress.set(hash, promise)
  return promise
}

export async function probeAudioTracks(videoPath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(videoPath, (err, meta) => {
      if (err) { resolve(1); return }
      const count = meta.streams.filter(s => s.codec_type === 'audio').length
      resolve(Math.max(count, 1))
    })
  })
}
