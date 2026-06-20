import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import fs from 'fs'
import path from 'path'
import type { CompressMetadata } from '../shared/types'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic.replace('app.asar', 'app.asar.unpacked'))
}

function qualityToCrf(quality: number, isVp9: boolean): number {
  if (isVp9) return Math.round(50 - (quality / 100) * 35)
  return Math.round(35 - (quality / 100) * 17)
}

export function buildOutputPath(
  inputPath: string,
  format: string,
  outputDir: string | null,
  suffix = 'compressed',
): string {
  const dir = outputDir ?? path.dirname(inputPath)
  const ext = path.extname(inputPath)
  const base = path.basename(inputPath, ext)
  const candidate = path.join(dir, `${base}_${suffix}.${format}`)
  if (!fs.existsSync(candidate)) return candidate
  let counter = 2
  while (true) {
    const next = path.join(dir, `${base}_${suffix}_${counter}.${format}`)
    if (!fs.existsSync(next)) return next
    counter++
  }
}

export function runCompress(
  inputPath: string,
  outputPath: string,
  metadata: CompressMetadata,
  onProgress: (percent: number) => void,
  onCommand: (cmd: ffmpeg.FfmpegCommand) => void,
): Promise<void> {
  const { quality, scale, format } = metadata
  const isVp9 = format === 'webm'
  const crf = qualityToCrf(quality, isVp9)

  return new Promise((resolve, reject) => {
    const { trimStart, trimEnd } = metadata

    const cmd = ffmpeg(inputPath)

    if (trimStart !== undefined && trimStart > 0) {
      cmd.seekInput(trimStart)
    }

    if (trimEnd !== undefined) {
      const clipDuration = trimEnd - (trimStart ?? 0)
      cmd.outputOption('-t', String(clipDuration))
    }

    if (isVp9) {
      cmd.videoCodec('libvpx-vp9').addOption('-crf', String(crf)).addOption('-b:v', '0')
    } else {
      cmd
        .videoCodec('libx264')
        .addOption('-crf', String(crf))
        .addOption('-preset', 'fast')
        .addOption('-movflags', '+faststart')
    }

    if (scale !== 1) {
      cmd.videoFilter(`scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2`)
    }

    onCommand(cmd)

    cmd
      .audioCodec(isVp9 ? 'libopus' : 'aac')
      .output(outputPath)
      .on('progress', ({ percent }) => onProgress(Math.min(percent ?? 0, 99)))
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
}
