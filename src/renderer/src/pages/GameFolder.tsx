import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, FolderOpen, Scissors, FileVideo, SortAsc, Trash2, X } from 'lucide-react'
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
import { cn, formatSize } from '@/lib/utils'
import { getGameGradient, getGameInitials } from '@/lib/gameCovers'
import { guessMarkFromName } from '../../../shared/clipmark'
import type { ClipMark } from '../../../shared/types'

interface GameInfo {
  name: string
  fullPath: string
  videoCount: number
  totalSize: number
}

interface VideoFile {
  name: string
  fullPath: string
  size: number
  modifiedAt: number
}

type SortKey = 'date' | 'name' | 'size'
type FilterKey = 'all' | 'originals' | 'clips'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Thumbnail card ────────────────────────────────────────────────────────────

function isGif(video: VideoFile): boolean {
  return video.name.toLowerCase().endsWith('.gif')
}

function MarkBadge({ mark }: { mark: Exclude<ClipMark, null> }) {
  return (
    <span
      className={cn(
        'absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shadow-sm',
        mark === 'gif'
          ? 'bg-black/70 text-white backdrop-blur-sm'
          : 'bg-primary text-primary-foreground',
      )}
    >
      {mark === 'gif' ? 'GIF' : 'Clip'}
    </span>
  )
}

function VideoCard({
  video,
  mark,
  mediaPort,
  selected,
  selectionMode,
  onClick,
  onSelect,
}: {
  video: VideoFile
  mark: ClipMark
  mediaPort: number
  selected: boolean
  selectionMode: boolean
  onClick: (e: React.MouseEvent) => void
  onSelect: () => void
}) {
  const gif = isGif(video)
  // A GIF is its own best thumbnail — no point running ffmpeg over it.
  const gifUrl =
    gif && mediaPort ? `http://127.0.0.1:${mediaPort}/${encodeURIComponent(video.fullPath)}` : null

  const [thumbUrl, setThumbUrl] = useState<string | null>(gifUrl)
  const [thumbLoading, setThumbLoading] = useState(!gif)
  const requested = useRef(false)

  useEffect(() => {
    if (gif) {
      setThumbUrl(gifUrl)
      return
    }
    if (requested.current || !mediaPort) return
    requested.current = true

    window.api.getThumbnail(video.fullPath).then((thumbPath) => {
      if (thumbPath) {
        setThumbUrl(`http://127.0.0.1:${mediaPort}/${encodeURIComponent(thumbPath)}`)
      }
      setThumbLoading(false)
    })
  }, [video.fullPath, mediaPort, gif, gifUrl])

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-xl overflow-hidden border bg-card transition-all duration-150 relative',
        selected
          ? 'ring-2 ring-primary border-primary'
          : 'hover:ring-2 ring-primary/40 hover:border-primary/40',
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {thumbLoading ? (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        ) : thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setThumbUrl(null)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileVideo className="w-8 h-8 text-muted-foreground/40" />
          </div>
        )}

        {mark && <MarkBadge mark={mark} />}

        {/* Selection checkbox — only visible in selection mode */}
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

        {/* Hover overlay — only when not selecting */}
        {!selectionMode && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
              {gif ? (
                <span className="text-white text-xs font-medium">Open</span>
              ) : (
                <>
                  <Scissors className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs font-medium">Edit & Trim</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info row */}
      <div className="px-3 py-3 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate leading-snug">{video.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatSize(video.size)} &bull; {formatDate(video.modifiedAt)}
          </p>
        </div>
        {!selectionMode && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.api.showInFolder(video.fullPath)
            }}
            className="shrink-0 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
            title="Show in Folder"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GameFolder() {
  const navigate = useNavigate()
  const location = useLocation()
  const game = (location.state as { game?: GameInfo } | null)?.game ?? null

  const [videos, setVideos] = useState<VideoFile[]>([])
  const [marks, setMarks] = useState<Record<string, ClipMark>>({})
  const [loading, setLoading] = useState(true)
  const [mediaPort, setMediaPort] = useState(0)
  const [sort, setSort] = useState<SortKey>('date')
  const [filter, setFilter] = useState<FilterKey>('all')

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<VideoFile[] | null>(null)

  const selectionMode = selected.size > 0

  useEffect(() => {
    window.api.mediaPort().then(setMediaPort)
  }, [])

  useEffect(() => {
    if (!game) return
    setLoading(true)
    setSelected(new Set())
    setMarks({})
    window.api
      .listVideos(game.fullPath)
      .then((list) => {
        setVideos(list)
        // Reading metadata takes a moment; until it lands, the filename
        // heuristic in markOf keeps badges on screen.
        window.api
          .getClipMarks(list.map((v) => v.fullPath))
          .then(setMarks)
          .catch(() => {})
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [game?.fullPath])

  const markOf = useCallback(
    (video: VideoFile): ClipMark =>
      video.fullPath in marks ? marks[video.fullPath] : guessMarkFromName(video.name),
    [marks],
  )

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectionMode) {
        e.preventDefault()
        setDeleteTarget(videos.filter((v) => selected.has(v.fullPath)))
      }
      if (e.key === 'Escape' && selectionMode) {
        setSelected(new Set())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectionMode, selected, videos])

  const toggleSelect = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const openVideo = useCallback(
    (video: VideoFile) => {
      // GIFs can't be trimmed here — hand them to the system viewer instead.
      if (isGif(video)) {
        window.api.openPath(video.fullPath)
        return
      }
      navigate('/editor', {
        state: { file: { path: video.fullPath, name: video.name, size: video.size } },
      })
    },
    [navigate],
  )

  const handleCardClick = useCallback(
    (video: VideoFile, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey || selectionMode) {
        toggleSelect(video.fullPath)
      } else {
        openVideo(video)
      }
    },
    [selectionMode, toggleSelect, openVideo],
  )

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await window.api.deleteFiles(deleteTarget.map((v) => v.fullPath))
    setVideos((prev) => prev.filter((v) => !deleteTarget.some((d) => d.fullPath === v.fullPath)))
    setSelected((prev) => {
      const next = new Set(prev)
      deleteTarget.forEach((d) => next.delete(d.fullPath))
      return next
    })
    setDeleteTarget(null)
  }

  if (!game) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4">
        <p className="text-muted-foreground text-sm">No game selected</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/hub')}>
          Back to Library
        </Button>
      </div>
    )
  }

  const [from, to] = getGameGradient(game.name)
  const initials = getGameInitials(game.name)

  const clipCount = videos.filter((v) => markOf(v) !== null).length

  const sorted = videos
    .filter((v) => {
      if (filter === 'clips') return markOf(v) !== null
      if (filter === 'originals') return markOf(v) === null
      return true
    })
    .sort((a, b) => {
      if (sort === 'date') return b.modifiedAt - a.modifiedAt
      if (sort === 'name') return a.name.localeCompare(b.name)
      return b.size - a.size
    })

  const totalSize = videos.reduce((s, v) => s + v.size, 0)

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Recent' },
    { key: 'name', label: 'Name' },
    { key: 'size', label: 'Size' },
  ]

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: videos.length },
    { key: 'originals', label: 'Originals', count: videos.length - clipCount },
    { key: 'clips', label: 'Clips', count: clipCount },
  ]

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/hub')}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Game badge */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-black text-white/60 shrink-0"
          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{game.name}</p>
          <p className="text-xs text-muted-foreground">
            {videos.length} videos &bull; {formatSize(totalSize)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.api.showInFolder(game.fullPath)}
          className="h-8 px-2 shrink-0 text-muted-foreground"
          title="Open folder"
        >
          <FolderOpen className="w-4 h-4" />
        </Button>
      </div>

      {/* Sort + filter bar */}
      {!loading && videos.length > 0 && (
        <div className="px-5 py-2 border-b flex items-center gap-2 shrink-0 flex-wrap">
          <SortAsc className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mr-1">Sort:</span>
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={cn(
                'text-xs px-2 py-0.5 rounded-md transition-colors',
                sort === key
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {label}
            </button>
          ))}

          <span className="w-px h-4 bg-border mx-1" />

          <span className="text-xs text-muted-foreground mr-1">Show:</span>
          {FILTERS.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'text-xs px-2 py-0.5 rounded-md transition-colors',
                filter === key
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {label} <span className="tabular-nums opacity-70">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-2.5 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <FileVideo className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {videos.length === 0 ? 'No videos found' : 'Nothing matches this filter'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">
            {sorted.map((video) => (
              <ContextMenu key={video.fullPath}>
                <ContextMenuTrigger className="block">
                  <VideoCard
                    video={video}
                    mark={markOf(video)}
                    mediaPort={mediaPort}
                    selected={selected.has(video.fullPath)}
                    selectionMode={selectionMode}
                    onClick={(e) => handleCardClick(video, e)}
                    onSelect={() => toggleSelect(video.fullPath)}
                  />
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {isGif(video) ? (
                    <ContextMenuItem onClick={() => window.api.openPath(video.fullPath)}>
                      Open
                    </ContextMenuItem>
                  ) : (
                    <>
                      <ContextMenuItem onClick={() => openVideo(video)}>
                        Edit &amp; Trim
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() =>
                          navigate('/gif', {
                            state: { file: { path: video.fullPath, name: video.name, size: video.size } },
                          })
                        }
                      >
                        Convert to GIF
                      </ContextMenuItem>
                    </>
                  )}
                  <ContextMenuItem onClick={() => toggleSelect(video.fullPath)}>
                    {selected.has(video.fullPath) ? 'Deselect' : 'Select'}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => window.api.showInFolder(video.fullPath)}>
                    Show in Folder
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteTarget([video])}
                  >
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
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
            onClick={() => setDeleteTarget(videos.filter((v) => selected.has(v.fullPath)))}
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
            <AlertDialogTitle>
              Delete {deleteTarget?.length === 1 ? 'video' : `${deleteTarget?.length} videos`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.length === 1
                ? <>This will permanently delete <strong>{deleteTarget[0].name}</strong>. This cannot be undone.</>
                : <>This will permanently delete {deleteTarget?.length} videos. This cannot be undone.</>}
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
