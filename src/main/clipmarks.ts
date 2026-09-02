import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import type { ClipMark } from '../shared/types'
import { guessMarkFromName } from '../shared/clipmark'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic.replace('app.asar', 'app.asar.unpacked'))
}
if (ffprobeStatic?.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path.replace('app.asar', 'app.asar.unpacked'))
}

/** Written into every output file's metadata so clips stay recognisable after a rename. */
export const CLIP_TAG = 'PreClip'

/** Tag keys worth reading. Anything else could collide with a real title/description. */
const TAG_KEYS = new Set(['comment', 'encoder_tool'])

const MAX_ENTRIES = 5000
const CONCURRENCY = 4

type CachedMark = 'clip' | 'gif' | 'none'

let cache: Record<string, CachedMark> | null = null
let saveTimer: NodeJS.Timeout | null = null

function cachePath(): string {
  return path.join(app.getPath('userData'), 'clipmarks.json')
}

function load(): Record<string, CachedMark> {
  if (!cache) {
    try {
      cache = JSON.parse(fs.readFileSync(cachePath(), 'utf-8'))
    } catch {
      cache = {}
    }
  }
  return cache!
}

function scheduleSave(): void {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    const store = load()
    // Entries are keyed by size+mtime, so edited files leave stale keys behind.
    // Probing is cheap enough that dropping the lot beats tracking liveness.
    if (Object.keys(store).length > MAX_ENTRIES) cache = {}
    try {
      fs.writeFileSync(cachePath(), JSON.stringify(cache), 'utf-8')
    } catch {}
  }, 1000)
}

function keyFor(filePath: string, stat: fs.Stats): string {
  return `${filePath}|${stat.size}|${Math.round(stat.mtimeMs)}`
}

function probeTag(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err || !data) return resolve(false)
      const bags = [data.format?.tags, ...(data.streams ?? []).map((s) => s.tags)]
      for (const tags of bags) {
        if (!tags) continue
        for (const [key, value] of Object.entries(tags)) {
          if (!TAG_KEYS.has(key.toLowerCase())) continue
          if (typeof value === 'string' && value.includes(CLIP_TAG)) return resolve(true)
        }
      }
      resolve(false)
    })
  })
}

/**
 * Resolve how each file was produced. Cached by path+size+mtime, so a folder
 * costs one ffprobe per new file and nothing on every visit after that.
 */
export async function getMarks(filePaths: string[]): Promise<Record<string, ClipMark>> {
  const store = load()
  const result: Record<string, ClipMark> = {}
  const pending: { filePath: string; key: string }[] = []
  let dirty = false

  for (const filePath of filePaths) {
    let stat: fs.Stats
    try {
      stat = fs.statSync(filePath)
    } catch {
      result[filePath] = null
      continue
    }
    const key = keyFor(filePath, stat)
    const cached = store[key]
    if (cached) {
      result[filePath] = cached === 'none' ? null : cached
    } else if (path.extname(filePath).toLowerCase() === '.gif') {
      store[key] = 'gif'
      result[filePath] = 'gif'
      dirty = true
    } else {
      pending.push({ filePath, key })
    }
  }

  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      while (cursor < pending.length) {
        const { filePath, key } = pending[cursor++]
        const tagged = await probeTag(filePath)
        const mark: ClipMark = tagged ? 'clip' : guessMarkFromName(path.basename(filePath))
        store[key] = mark ?? 'none'
        result[filePath] = mark
        dirty = true
      }
    }),
  )

  if (dirty) scheduleSave()
  return result
}

/** Record a freshly produced file so the library never has to probe it. */
export function markOutput(filePath: string, mark: Exclude<ClipMark, null>): void {
  try {
    load()[keyFor(filePath, fs.statSync(filePath))] = mark
    scheduleSave()
  } catch {}
}
