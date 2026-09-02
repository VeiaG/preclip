import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { app } from 'electron'
import type { GifDither, GifMetadata } from '../shared/types'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic.replace('app.asar', 'app.asar.unpacked'))
}

/** Bayer needs a scale to look right; the other two take no arguments. */
const DITHER_ARG: Record<GifDither, string> = {
  none: 'none',
  bayer: 'bayer:bayer_scale=3',
  sierra2_4a: 'sierra2_4a',
}

/** `width: 0` means keep the source width. */
function scaleFilter(width: number): string {
  return width > 0 ? `,scale=${width}:-1:flags=lanczos` : ''
}

// ── Conversion ────────────────────────────────────────────────────────────────

// A GIF is limited to 256 colours, so quality lives or dies on the palette.
// Generating one tailored to the clip (pass 1) and applying it (pass 2) is
// dramatically better than ffmpeg's default web-safe palette.
const PALETTE_SHARE = 0.15

export function runGif(
  inputPath: string,
  outputPath: string,
  metadata: GifMetadata,
  onProgress: (percent: number) => void,
  onCommand: (cmd: ffmpeg.FfmpegCommand) => void,
): Promise<void> {
  const { fps, width, colors, dither, loop } = metadata
  const palettePath = path.join(
    os.tmpdir(),
    `preclip-palette-${crypto.randomBytes(6).toString('hex')}.png`,
  )

  const generatePalette = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const cmd = ffmpeg(inputPath)
        .videoFilters(`fps=${fps}${scaleFilter(width)},palettegen=max_colors=${colors}`)
        .outputOptions(['-y'])
        .output(palettePath)
      onCommand(cmd)
      cmd
        .on('progress', ({ percent }) =>
          onProgress(Math.min(percent ?? 0, 100) * PALETTE_SHARE),
        )
        .on('end', () => resolve())
        .on('error', reject)
        .run()
    })

  const applyPalette = (): Promise<void> =>
    new Promise((resolve, reject) => {
      const cmd = ffmpeg(inputPath)
        .input(palettePath)
        .complexFilter(
          `[0:v]fps=${fps}${scaleFilter(width)}[x];[x][1:v]paletteuse=dither=${DITHER_ARG[dither]}`,
        )
        .outputOptions(['-loop', loop ? '0' : '-1'])
        .output(outputPath)
      onCommand(cmd)
      cmd
        .on('progress', ({ percent }) =>
          onProgress(
            Math.min(
              PALETTE_SHARE * 100 + (Math.min(percent ?? 0, 100) * (1 - PALETTE_SHARE)),
              99,
            ),
          ),
        )
        .on('end', () => resolve())
        .on('error', reject)
        .run()
    })

  return generatePalette()
    .then(applyPalette)
    .finally(() => {
      try {
        fs.rmSync(palettePath, { force: true })
      } catch {}
    })
}

// ── Single-frame preview ──────────────────────────────────────────────────────

let previewDir: string | null = null

function getPreviewDir(): string {
  if (!previewDir) {
    previewDir = path.join(app.getPath('userData'), 'gifpreview')
    if (!fs.existsSync(previewDir)) fs.mkdirSync(previewDir, { recursive: true })
  }
  return previewDir
}

export function clearGifPreviewCache(): void {
  try {
    for (const entry of fs.readdirSync(getPreviewDir())) {
      try {
        fs.rmSync(path.join(getPreviewDir(), entry), { force: true })
      } catch {}
    }
  } catch {}
}

const inProgress = new Map<string, Promise<string>>()

/**
 * Render one frame through the exact same palettegen/paletteuse pair the real
 * conversion uses, so the preview shows the true colour banding for the chosen
 * settings rather than a clean video frame.
 */
export function generateGifPreview(
  videoPath: string,
  timeSec: number,
  opts: { width: number; colors: number; dither: GifDither },
): Promise<string> {
  const key = crypto
    .createHash('md5')
    .update(`${videoPath}:${timeSec.toFixed(2)}:${opts.width}:${opts.colors}:${opts.dither}`)
    .digest('hex')
  const outPath = path.join(getPreviewDir(), `${key}.png`)

  if (fs.existsSync(outPath)) return Promise.resolve(outPath)

  const running = inProgress.get(key)
  if (running) return running

  const task = new Promise<string>((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timeSec)
      .frames(1)
      .complexFilter(
        // trim first: palettegen only emits at EOF, so without a hard one-frame
        // cut it would swallow the whole rest of the video before paletteuse runs.
        `[0:v]trim=end_frame=1,setpts=PTS-STARTPTS${scaleFilter(opts.width)},split[a][b];` +
          `[a]palettegen=max_colors=${opts.colors}[p];` +
          `[b][p]paletteuse=dither=${DITHER_ARG[opts.dither]}`,
      )
      .outputOptions(['-y'])
      .output(outPath)
      .on('end', () => resolve(outPath))
      .on('error', reject)
      .run()
  }).finally(() => {
    inProgress.delete(key)
  })

  inProgress.set(key, task)
  return task
}
