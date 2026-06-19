import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, FolderOpen, Scissors, FileVideo, SortAsc } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getGameGradient, getGameInitials } from '@/lib/gameCovers'

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

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Thumbnail card ────────────────────────────────────────────────────────────

function VideoCard({
  video,
  mediaPort,
  onEdit,
}: {
  video: VideoFile
  mediaPort: number
  onEdit: () => void
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)
  const [thumbLoading, setThumbLoading] = useState(true)
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current || !mediaPort) return
    requested.current = true

    window.api.getThumbnail(video.fullPath).then((thumbPath) => {
      if (thumbPath) {
        setThumbUrl(`http://127.0.0.1:${mediaPort}/${encodeURIComponent(thumbPath)}`)
      }
      setThumbLoading(false)
    })
  }, [video.fullPath, mediaPort])

  return (
    <button
      onClick={onEdit}
      className="group text-left rounded-xl overflow-hidden border bg-card hover:ring-2 ring-primary/40 hover:border-primary/40 transition-all duration-150"
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

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <Scissors className="w-3.5 h-3.5 text-white" />
            <span className="text-white text-xs font-medium">Edit & Trim</span>
          </div>
        </div>
      </div>

      {/* Info row */}
      <div className="px-3 py-3 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate leading-snug">{video.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatSize(video.size)} &bull; {formatDate(video.modifiedAt)}
          </p>
        </div>
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
  const [loading, setLoading] = useState(true)
  const [mediaPort, setMediaPort] = useState(0)
  const [sort, setSort] = useState<SortKey>('date')

  useEffect(() => {
    window.api.mediaPort().then(setMediaPort)
  }, [])

  useEffect(() => {
    if (!game) return
    setLoading(true)
    window.api
      .listVideos(game.fullPath)
      .then(setVideos)
      .catch(() => setVideos([]))
      .finally(() => setLoading(false))
  }, [game?.fullPath])

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

  const sorted = [...videos].sort((a, b) => {
    if (sort === 'date') return b.modifiedAt - a.modifiedAt
    if (sort === 'name') return a.name.localeCompare(b.name)
    return b.size - a.size
  })

  const totalSize = videos.reduce((s, v) => s + v.size, 0)

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'name', label: 'Name' },
    { key: 'size', label: 'Size' },
  ]

  return (
    <div className="flex flex-col h-full">
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

      {/* Sort bar */}
      {!loading && videos.length > 0 && (
        <div className="px-5 py-2 border-b flex items-center gap-2 shrink-0">
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
            <p className="text-sm text-muted-foreground">No videos found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {sorted.map((video) => (
              <VideoCard
                key={video.fullPath}
                video={video}
                mediaPort={mediaPort}
                onEdit={() =>
                  navigate('/editor', {
                    state: { file: { path: video.fullPath, name: video.name, size: video.size } },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
