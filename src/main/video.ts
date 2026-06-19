import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import fs from 'fs'

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}

export function hasMoovAtStart(filePath: string): boolean {
  let fd: number | null = null
  try {
    fd = fs.openSync(filePath, 'r')
    const buf = Buffer.allocUnsafe(8)
    let offset = 0

    while (offset < 32 * 1024 * 1024) {
      if (fs.readSync(fd, buf, 0, 8, offset) < 8) break
      const boxSize = buf.readUInt32BE(0)
      const boxType = buf.subarray(4, 8).toString('ascii')

      if (boxType === 'moov') return true
      if (boxType === 'mdat') return false
      if (boxSize < 8) break
      offset += boxSize
    }
    return true
  } catch {
    return true
  } finally {
    if (fd !== null) fs.closeSync(fd)
  }
}

export function remuxFaststart(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('copy')
      // Re-encode to AAC-LC: NVIDIA DVR may use HE-AAC or non-standard params
      // that Chromium's decoder rejects; standard AAC-LC 192k/48kHz works everywhere.
      .audioCodec('aac')
      .audioBitrate('192k')
      .audioFrequency(48000)
      .audioChannels(2)
      .addOption('-movflags', '+faststart')
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run()
  })
}
