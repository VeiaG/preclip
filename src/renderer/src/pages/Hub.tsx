import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, FolderOpen, RefreshCw, Settings, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getGameGradient, getGameInitials } from '@/lib/gameCovers'
import type { AppSettings } from '../../../shared/types'

interface GameFolder {
  name: string
  fullPath: string
  videoCount: number
  totalSize: number
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

// ── Game Card ─────────────────────────────────────────────────────────────────

function GameCard({
  game,
  mediaPort,
  onClick,
}: {
  game: GameFolder
  mediaPort: number
  onClick: () => void
}) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [from, to] = getGameGradient(game.name)
  const initials = getGameInitials(game.name)

  useEffect(() => {
    if (!mediaPort) return
    window.api.getGameCover(game.name).then((imgPath) => {
      if (imgPath) {
        setCoverUrl(`http://127.0.0.1:${mediaPort}/${encodeURIComponent(imgPath)}`)
      }
    })
  }, [game.name, mediaPort])

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl overflow-hidden border bg-card hover:ring-2 ring-primary/40 hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-black/10"
    >
      {/* Cover area — matches capsule_616x353 ratio */}
      <div className="aspect-[616/353] relative overflow-hidden">
        {/* Gradient fallback — always rendered, image appears on top */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
        >
          <span className="text-6xl font-black text-white/10 select-none tracking-tight">
            {initials}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Steam cover image */}
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top"
            onError={() => setCoverUrl(null)}
          />
        )}

        {/* Hover arrow */}
        <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4 text-white/80 drop-shadow" />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm truncate leading-snug">{game.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {game.videoCount} {game.videoCount === 1 ? 'video' : 'videos'} &bull; {formatSize(game.totalSize)}
        </p>
      </div>
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Hub() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [games, setGames] = useState<GameFolder[]>([])
  const [loading, setLoading] = useState(false)
  const [mediaPort, setMediaPort] = useState(0)

  useEffect(() => {
    window.api.mediaPort().then(setMediaPort)
  }, [])

  const loadGames = useCallback(async (capturesPath: string) => {
    setLoading(true)
    try {
      const result = await window.api.listGames(capturesPath)
      setGames(result)
    } catch {
      setGames([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    window.api.getSettings().then((s) => {
      setSettings(s)
      if (s.nvidiaCapturesPath) loadGames(s.nvidiaCapturesPath)
    })
  }, [loadGames])

  const totalVideos = games.reduce((s, g) => s + g.videoCount, 0)
  const totalSize = games.reduce((s, g) => s + g.totalSize, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold">Game Library</h1>
          {settings?.nvidiaCapturesPath ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{settings.nvidiaCapturesPath}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">No captures folder configured</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {settings?.nvidiaCapturesPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => settings.nvidiaCapturesPath && loadGames(settings.nvidiaCapturesPath)}
              disabled={loading}
              className="h-8 px-2"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/settings')} className="h-8 gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            Settings
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {!settings?.nvidiaCapturesPath ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="p-5 rounded-2xl bg-muted">
              <Gamepad2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-lg">No captures folder set</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Configure your NVIDIA recordings folder in Settings to browse your game clips.
              </p>
            </div>
            <Button onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Go to Settings
            </Button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border overflow-hidden animate-pulse">
                <div className="aspect-[616/353] bg-muted" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="p-5 rounded-2xl bg-muted">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">No recordings found</p>
              <p className="text-sm text-muted-foreground mt-1">
                No game folders with video files were found in the selected directory.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 mb-5 text-sm text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{games.length}</span> games
              </span>
              <span>&bull;</span>
              <span>
                <span className="font-semibold text-foreground">{totalVideos}</span> videos
              </span>
              <span>&bull;</span>
              <span>
                <span className="font-semibold text-foreground">{formatSize(totalSize)}</span> total
              </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((game) => (
                <GameCard
                  key={game.fullPath}
                  game={game}
                  mediaPort={mediaPort}
                  onClick={() => navigate('/hub/folder', { state: { game } })}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
