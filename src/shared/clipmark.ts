import type { ClipMark } from './types'

/**
 * Files produced before PreClip started writing metadata tags can only be
 * recognised by the suffix `buildOutputPath()` gives them. Used both as the
 * main-process fallback when a probe finds no tag, and in the renderer to
 * paint badges instantly while the probe is still running.
 */
const CLIP_SUFFIX = /_(clip|compressed)(_\d+)?$/i

export function guessMarkFromName(fileName: string): ClipMark {
  const dot = fileName.lastIndexOf('.')
  const ext = dot === -1 ? '' : fileName.slice(dot).toLowerCase()
  const base = dot === -1 ? fileName : fileName.slice(0, dot)
  if (ext === '.gif') return 'gif'
  return CLIP_SUFFIX.test(base) ? 'clip' : null
}
