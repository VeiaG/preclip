import { net, app, clipboard } from 'electron'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import path from 'path'
import fs from 'fs'
import os from 'os'
import crypto from 'crypto'
import type { SteamMatch } from '../shared/types'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic.replace('app.asar', 'app.asar.unpacked'))
}

// Steam's capsule is 616x353, which the library grid is laid out for. We store
// one pixel shorter: MJPEG at 4:2:0 cannot encode an odd height, so a 353 target
// silently became 352 for sources that decode to yuv420p (jpg, webp) while
// staying 353 for rgb24 ones (png, gif). An even height keeps every custom cover
// identical, and the grid's object-cover hides the one-pixel difference.
const COVER_WIDTH = 616
const COVER_HEIGHT = 352

const MAX_SEARCH_RESULTS = 5

let coversDir: string | null = null

function getDir(): string {
  if (!coversDir) {
    coversDir = path.join(app.getPath('userData'), 'covers')
    fs.mkdirSync(path.join(coversDir, 'custom'), { recursive: true })
  }
  return coversDir
}

/**
 * Custom covers are keyed by the folder name, not the Steam id — a folder can
 * have a cover without ever matching a Steam app. Shared by read and write so
 * the two can't drift apart.
 */
export function customCoverPath(gameName: string): string {
  const slug = gameName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  return path.join(getDir(), 'custom', `${slug}.jpg`)
}

type IdCache = Record<string, number | null>

function readIdCache(): IdCache {
  try {
    return JSON.parse(fs.readFileSync(path.join(getDir(), 'ids.json'), 'utf-8'))
  } catch {
    return {}
  }
}

function writeIdCache(data: IdCache): void {
  fs.writeFileSync(path.join(getDir(), 'ids.json'), JSON.stringify(data, null, 2))
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const req = net.request({ url, redirect: 'follow' })
    const chunks: Buffer[] = []
    req.on('response', (res) => {
      if (res.statusCode !== 200) { resolve(null); return }
      res.on('data', (c) => chunks.push(Buffer.from(c)))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', () => resolve(null))
    })
    req.on('error', () => resolve(null))
    req.end()
  })
}

async function searchSteam(term: string): Promise<SteamMatch[]> {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&cc=US&l=en`
  const buf = await fetchBuffer(url)
  if (!buf) return []
  try {
    const json = JSON.parse(buf.toString('utf-8'))
    const items = (json?.items as Array<{ id: number; name: string }> | undefined) ?? []
    return items.slice(0, MAX_SEARCH_RESULTS).map((i) => ({ appId: i.id, name: i.name }))
  } catch {
    return []
  }
}

async function downloadCover(appId: number, dest: string): Promise<boolean> {
  for (const variant of ['capsule_616x353.jpg', 'header.jpg']) {
    const url = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${appId}/${variant}`
    const buf = await fetchBuffer(url)
    if (buf) {
      fs.writeFileSync(dest, buf)
      return true
    }
  }
  return false
}

const inProgress = new Map<string, Promise<string | null>>()

async function resolve(gameName: string): Promise<string | null> {
  // A custom cover always wins — it exists precisely because Steam got it wrong.
  const custom = customCoverPath(gameName)
  if (fs.existsSync(custom)) return custom

  const dir = getDir()
  const idCache = readIdCache()
  let appId: number | null

  if (gameName in idCache) {
    appId = idCache[gameName]
  } else {
    console.log(`[covers] searching Steam for "${gameName}"`)
    appId = (await searchSteam(gameName))[0]?.appId ?? null
    idCache[gameName] = appId
    writeIdCache(idCache)
    console.log(`[covers] "${gameName}" → appId ${appId}`)
  }

  if (appId === null) return null

  const imgPath = path.join(dir, `${appId}.jpg`)
  if (fs.existsSync(imgPath)) return imgPath

  const ok = await downloadCover(appId, imgPath)
  return ok ? imgPath : null
}

export function getGameCover(gameName: string): Promise<string | null> {
  const hit = inProgress.get(gameName)
  if (hit) return hit
  const p = resolve(gameName).finally(() => inProgress.delete(gameName))
  inProgress.set(gameName, p)
  return p
}

// ── Custom covers ─────────────────────────────────────────────────────────────

/**
 * Re-encode whatever the user handed us into the grid's capsule format.
 * `force_original_aspect_ratio=increase` + `crop` fills the frame and trims the
 * overflow rather than squashing it; `-frames:v 1` takes the first frame so an
 * animated GIF works as a source too.
 */
function normalizeCover(sourcePath: string, dest: string): Promise<void> {
  return new Promise((res, rej) => {
    ffmpeg(sourcePath)
      .frames(1)
      .videoFilters(
        `scale=${COVER_WIDTH}:${COVER_HEIGHT}:force_original_aspect_ratio=increase,` +
          `crop=${COVER_WIDTH}:${COVER_HEIGHT}`,
      )
      .outputOptions(['-pix_fmt', 'yuvj420p', '-q:v', '2', '-y'])
      .output(dest)
      .on('end', () => res())
      .on('error', rej)
      .run()
  })
}

function tempFile(ext: string): string {
  return path.join(os.tmpdir(), `preclip-cover-${crypto.randomBytes(6).toString('hex')}${ext}`)
}

export async function setCustomCover(gameName: string, sourcePath: string): Promise<string | null> {
  const dest = customCoverPath(gameName)
  // Encode to a temp file first: a failed convert must not destroy the cover
  // that is already there.
  const tmp = tempFile('.jpg')
  try {
    await normalizeCover(sourcePath, tmp)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(tmp, dest)
    return dest
  } catch (err) {
    console.log(`[covers] custom cover failed for "${gameName}":`, err)
    return null
  } finally {
    try { fs.rmSync(tmp, { force: true }) } catch {}
  }
}

export async function setCustomCoverFromClipboard(gameName: string): Promise<string | null> {
  const image = clipboard.readImage()
  if (image.isEmpty()) return null
  const tmp = tempFile('.png')
  try {
    fs.writeFileSync(tmp, image.toPNG())
    return await setCustomCover(gameName, tmp)
  } catch {
    return null
  } finally {
    try { fs.rmSync(tmp, { force: true }) } catch {}
  }
}

export function clearCustomCover(gameName: string): void {
  try { fs.rmSync(customCoverPath(gameName), { force: true }) } catch {}
}

export function hasCustomCover(gameName: string): boolean {
  return fs.existsSync(customCoverPath(gameName))
}

// ── Steam match override ──────────────────────────────────────────────────────

export function searchSteamCovers(term: string): Promise<SteamMatch[]> {
  return searchSteam(term)
}

/** Pin a game folder to a specific Steam app and fetch that app's capsule. */
export async function setSteamAppId(gameName: string, appId: number): Promise<string | null> {
  const idCache = readIdCache()
  idCache[gameName] = appId
  writeIdCache(idCache)

  // A custom cover outranks Steam in resolve(), so choosing a Steam match here
  // would otherwise have no visible effect.
  clearCustomCover(gameName)

  const imgPath = path.join(getDir(), `${appId}.jpg`)
  if (fs.existsSync(imgPath)) return imgPath
  const ok = await downloadCover(appId, imgPath)
  return ok ? imgPath : null
}
