import { net, app } from 'electron'
import path from 'path'
import fs from 'fs'

let coversDir: string | null = null

function getDir(): string {
  if (!coversDir) {
    coversDir = path.join(app.getPath('userData'), 'covers')
    fs.mkdirSync(path.join(coversDir, 'custom'), { recursive: true })
  }
  return coversDir
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

async function searchSteamId(name: string): Promise<number | null> {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&cc=US&l=en`
  const buf = await fetchBuffer(url)
  if (!buf) return null
  try {
    const json = JSON.parse(buf.toString('utf-8'))
    return (json?.items as Array<{ id: number }> | undefined)?.[0]?.id ?? null
  } catch {
    return null
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
  const dir = getDir()

  // Manual override: drop a jpg into covers/custom/{sanitized-name}.jpg
  const slug = gameName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const custom = path.join(dir, 'custom', `${slug}.jpg`)
  if (fs.existsSync(custom)) return custom

  const idCache = readIdCache()
  let appId: number | null

  if (gameName in idCache) {
    appId = idCache[gameName]
  } else {
    console.log(`[covers] searching Steam for "${gameName}"`)
    appId = await searchSteamId(gameName)
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
