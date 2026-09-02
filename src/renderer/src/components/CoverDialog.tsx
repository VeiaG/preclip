import { useState, useEffect, useCallback } from 'react'
import { Upload, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, isImageFile } from '@/lib/utils'
import { getGameGradient, getGameInitials } from '@/lib/gameCovers'
import type { SteamMatch } from '../../../shared/types'

interface CoverDialogProps {
  /** The game to edit, or null when the dialog is closed. */
  gameName: string | null
  mediaPort: number
  onClose: () => void
  onCoverChanged: (gameName: string) => void
}

export function CoverDialog({ gameName, mediaPort, onClose, onCoverChanged }: CoverDialogProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [hasCustom, setHasCustom] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SteamMatch[] | null>(null)
  const [searching, setSearching] = useState(false)

  // The cover path never changes when the image behind it does, so the URL
  // carries a nonce to defeat the renderer's image cache.
  const refresh = useCallback(async () => {
    if (!gameName || !mediaPort) return
    const [imgPath, custom] = await Promise.all([
      window.api.getGameCover(gameName),
      window.api.hasCustomCover(gameName),
    ])
    setHasCustom(custom)
    setCoverUrl(
      imgPath
        ? `http://127.0.0.1:${mediaPort}/${encodeURIComponent(imgPath)}?v=${Date.now()}`
        : null,
    )
  }, [gameName, mediaPort])

  // Reset the form and load the cover when a different game is opened. The
  // reads come first so every state update lands in one commit after the await,
  // and `cancelled` drops the result if the dialog moved on meanwhile.
  useEffect(() => {
    if (!gameName || !mediaPort) return
    let cancelled = false
    void (async () => {
      const [imgPath, custom] = await Promise.all([
        window.api.getGameCover(gameName),
        window.api.hasCustomCover(gameName),
      ])
      if (cancelled) return
      setTerm(gameName)
      setResults(null)
      setStatus(null)
      setHasCustom(custom)
      setCoverUrl(
        imgPath
          ? `http://127.0.0.1:${mediaPort}/${encodeURIComponent(imgPath)}?v=${Date.now()}`
          : null,
      )
    })()
    return () => {
      cancelled = true
    }
  }, [gameName, mediaPort])

  const applied = useCallback(
    (imgPath: string | null, failure: string) => {
      if (!gameName) return
      if (imgPath) {
        setStatus(null)
        onCoverChanged(gameName)
        refresh()
      } else {
        setStatus(failure)
      }
    },
    [gameName, onCoverChanged, refresh],
  )

  const applyFile = useCallback(
    async (sourcePath: string) => {
      if (!gameName) return
      setBusy(true)
      try {
        applied(await window.api.setCustomCover(gameName, sourcePath), 'Could not read that image.')
      } finally {
        setBusy(false)
      }
    },
    [gameName, applied],
  )

  const handleChooseFile = async () => {
    const picked = await window.api.openImageFile()
    if (picked) applyFile(picked)
  }

  const handlePaste = useCallback(async () => {
    if (!gameName) return
    setBusy(true)
    try {
      applied(
        await window.api.setCustomCoverFromClipboard(gameName),
        'No image in the clipboard.',
      )
    } finally {
      setBusy(false)
    }
  }, [gameName, applied])

  // Ctrl+V anywhere in the dialog — the dialog is what makes the target
  // unambiguous, which a grid-wide paste shortcut could not be.
  useEffect(() => {
    if (!gameName) return
    const onPaste = () => handlePaste()
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [gameName, handlePaste])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (!isImageFile(file)) {
      setStatus('That file is not an image.')
      return
    }
    applyFile(window.api.getPathForFile(file))
  }

  const handleReset = async () => {
    if (!gameName) return
    setBusy(true)
    try {
      const imgPath = await window.api.clearCustomCover(gameName)
      onCoverChanged(gameName)
      await refresh()
      if (!imgPath) setStatus('No Steam cover found for this name either.')
    } finally {
      setBusy(false)
    }
  }

  const handleSearch = async () => {
    if (!term.trim()) return
    setSearching(true)
    setStatus(null)
    try {
      const found = await window.api.searchSteamCovers(term.trim())
      setResults(found)
      if (found.length === 0) setStatus('Steam returned no matches for that name.')
    } finally {
      setSearching(false)
    }
  }

  const handlePickMatch = async (match: SteamMatch) => {
    if (!gameName) return
    setBusy(true)
    try {
      applied(
        await window.api.setSteamAppId(gameName, match.appId),
        `No cover art available for ${match.name}.`,
      )
      setResults(null)
    } finally {
      setBusy(false)
    }
  }

  const [from, to] = getGameGradient(gameName ?? '')
  const initials = getGameInitials(gameName ?? '')

  return (
    <Dialog open={gameName !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cover art</DialogTitle>
          <DialogDescription className="truncate">{gameName}</DialogDescription>
        </DialogHeader>

        {/* Preview doubles as a drop target */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          className={cn(
            'relative aspect-[616/353] rounded-lg overflow-hidden border-2 border-dashed transition-colors',
            dragging ? 'border-primary' : 'border-transparent ring-1 ring-border',
          )}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
          >
            <span className="text-5xl font-black text-white/10 select-none tracking-tight">
              {initials}
            </span>
          </div>
          {coverUrl && (
            <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-top" />
          )}
          {(dragging || busy) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium text-white">
              {busy ? 'Working…' : 'Drop image to use as cover'}
            </div>
          )}
          {hasCustom && !dragging && !busy && (
            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground">
              Custom
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleChooseFile} disabled={busy} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            Choose file
          </Button>
          <Button variant="outline" size="sm" onClick={handlePaste} disabled={busy}>
            Paste
          </Button>
          <span className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={busy || !hasCustom}
            className="gap-1.5 text-muted-foreground"
            title="Remove the custom cover and fall back to Steam"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset
          </Button>
        </div>

        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Or match a different Steam game
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Game name on Steam"
              className="h-8"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={searching || !term.trim()}
              className="shrink-0 gap-1.5"
            >
              {searching && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Search
            </Button>
          </div>

          {results && results.length > 0 && (
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
              {results.map((match) => (
                <button
                  key={match.appId}
                  onClick={() => handlePickMatch(match)}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="flex-1 truncate">{match.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {match.appId}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {status && <p className="text-xs text-destructive">{status}</p>}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
