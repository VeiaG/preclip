import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Gamepad2, FolderOpen, RefreshCw, Settings, ChevronRight, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  selected,
  selectionMode,
  onClick,
  onSelect,
  onOpenFolder,
}: {
  game: GameFolder
  mediaPort: number
  selected: boolean
  selectionMode: boolean
  onClick: (e: React.MouseEvent) => void
  onSelect: () => void
  onOpenFolder: () => void
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
      className={cn(
        'group w-full text-left rounded-xl overflow-hidden border bg-card transition-all duration-200 hover:shadow-lg hover:shadow-black/10 relative',
        selected
          ? 'ring-2 ring-primary border-primary'
          : 'hover:ring-2 ring-primary/40 hover:border-primary/40',
      )}
    >
      {/* Cover area */}
      <div className="aspect-[616/353] relative overflow-hidden">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
        >
          <span className="text-6xl font-black text-white/10 select-none tracking-tight">
            {initials}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-top"
            onError={() => setCoverUrl(null)}
          />
        )}

        {/* Selection checkbox (top-right) — only visible in selection mode */}
        {selectionMode && (
        <div
          className="absolute top-2 right-2 z-20"
          onClick={(e) => { e.stopPropagation(); onSelect() }}
        >
          <div
            className={cn(
              'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
              selected
                ? 'bg-primary border-primary'
                : 'bg-black/40 border-white/70 backdrop-blur-sm',
            )}
          >
            {selected && <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
        </div>
        )}

        {/* Hover arrow (only when not in selection mode) */}
        {!selectionMode && (
          <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="w-4 h-4 text-white/80 drop-shadow" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-semibold text-sm truncate leading-snug">{game.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {game.videoCount} {game.videoCount === 1 ? 'video' : 'videos'} &bull; {formatSize(game.totalSize)}
        </p>
      </div>

      {/* Show-in-folder button (only when not selecting) */}
      {!selectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onOpenFolder()
          }}
          className="absolute bottom-3 right-3 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
          title="Show in Explorer"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
      )}
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

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<GameFolder[] | null>(null)

  const selectionMode = selected.size > 0

  useEffect(() => {
    window.api.mediaPort().then(setMediaPort)
  }, [])

  const loadGames = useCallback(async (capturesPath: string) => {
    setLoading(true)
    setSelected(new Set())
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

  // Delete key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectionMode) {
        e.preventDefault()
        setDeleteTarget(games.filter((g) => selected.has(g.fullPath)))
      }
      if (e.key === 'Escape' && selectionMode) {
        setSelected(new Set())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectionMode, selected, games])

  const toggleSelect = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const handleCardClick = useCallback(
    (game: GameFolder, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey || selectionMode) {
        toggleSelect(game.fullPath)
      } else {
        navigate('/hub/folder', { state: { game } })
      }
    },
    [selectionMode, toggleSelect, navigate],
  )

  const confirmDelete = async () => {
    if (!deleteTarget) return
    for (const g of deleteTarget) {
      await window.api.deleteFolder(g.fullPath)
    }
    setGames((prev) => prev.filter((g) => !deleteTarget.some((d) => d.fullPath === g.fullPath)))
    setSelected((prev) => {
      const next = new Set(prev)
      deleteTarget.forEach((d) => next.delete(d.fullPath))
      return next
    })
    setDeleteTarget(null)
  }

  const totalVideos = games.reduce((s, g) => s + g.videoCount, 0)
  const totalSize = games.reduce((s, g) => s + g.totalSize, 0)

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center gap-3 shrink-0">
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">
              {games.map((game) => (
                <ContextMenu key={game.fullPath}>
                  <ContextMenuTrigger className="block">
                    <GameCard
                        game={game}
                        mediaPort={mediaPort}
                        selected={selected.has(game.fullPath)}
                        selectionMode={selectionMode}
                        onClick={(e) => handleCardClick(game, e)}
                        onSelect={() => toggleSelect(game.fullPath)}
                        onOpenFolder={() => window.api.showInFolder(game.fullPath)}
                      />
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => navigate('/hub/folder', { state: { game } })}>
                      Open
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => toggleSelect(game.fullPath)}>
                      {selected.has(game.fullPath) ? 'Deselect' : 'Select'}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => window.api.showInFolder(game.fullPath)}>
                      Show in Explorer
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget([game])}
                    >
                      Delete Folder
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating selection bar */}
      {selectionMode && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-popover border shadow-xl rounded-2xl px-4 py-2.5 min-w-[240px]">
          <span className="text-sm font-medium flex-1">
            {selected.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setDeleteTarget(games.filter((g) => selected.has(g.fullPath)))}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setSelected(new Set())}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.length === 1 ? 'folder' : `${deleteTarget?.length} folders`}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.length === 1
                ? <>This will permanently delete <strong>{deleteTarget[0].name}</strong> and all its videos. This cannot be undone.</>
                : <>This will permanently delete {deleteTarget?.length} game folders and all their videos. This cannot be undone.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
