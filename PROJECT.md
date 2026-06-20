# VideoKit — Project Reference

## Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 39 |
| Build | electron-vite 5, Vite 7 |
| UI | React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, shadcn/ui (base-ui variant) |
| Package manager | pnpm |
| FFmpeg | `ffmpeg-static` + `ffprobe-static` + `fluent-ffmpeg` |

**Window:** Frameless (`frame: false`), transparent with Windows Acrylic blur (`backgroundMaterial: 'acrylic'`). Custom TitleBar handles drag region + window controls via IPC.

---

## Directory structure

```
src/
  main/             — Electron main process
  preload/          — Context bridge (index.ts + index.d.ts types)
  renderer/src/
    App.tsx         — Router + providers
    pages/          — Route-level pages
    components/
      layout/       — Layout, Sidebar, TitleBar
      ui/           — shadcn/ui primitives
    context/        — JobsContext
    hooks/          — use-mobile.ts
    lib/            — utils.ts (cn), gameCovers.ts
  shared/
    types.ts        — Types shared between main and renderer
```

---

## Main process (`src/main/`)

### `index.ts`
Entry point. Creates BrowserWindow, starts HTTP media server, registers all IPC handlers.

**Media server:** HTTP on random port (`127.0.0.1:PORT`), serves local files by path with Range request support. Port exposed via `media:port` IPC. Used instead of custom Electron protocol to avoid quirks with range requests and video seeking.

### `compress.ts`
Pure FFmpeg logic. `runCompress()` builds and runs the fluent-ffmpeg command. `buildOutputPath()` generates a non-conflicting output filename (`_compressed` or `_clip` suffix).

Codecs: libx264 (mp4/mov), libvpx-vp9 (webm). Supports trim (seekInput + `-t`), scale (`-vf scale` or `-filter_complex` when merging audio), audio merge (`amerge` filter when `mergeAudioTracks: true`).

### `jobQueue.ts`
In-memory job queue. `addJob()` creates a job and starts it if slots available. `cancelJob()` kills the running ffmpeg process via `SIGKILL`. Respects `maxParallelJobs` setting. Broadcasts `jobs:updated` IPC event on every state change.

### `thumbnails.ts`
Generates JPEG thumbnails (320px wide, at 1s) into `userData/thumbnails/` keyed by MD5 of path. Concurrency-limited to 2. Persists on disk between restarts.

### `frames.ts`
Generates N timeline strip frames (120px wide, evenly distributed) into `userData/frames/<hash>/`. Cleared on every startup (ephemeral editing cache). Concurrency: 4 at a time.

Also exports `probeAudioTracks(path)` — uses ffprobe to count audio streams.

### `covers.ts`
Fetches Steam game cover art by game name.

### `settings.ts`
Reads/writes `AppSettings` to `userData/settings.json`.

---

## Shared types (`src/shared/types.ts`)

```ts
interface CompressMetadata {
  quality: number           // 1–100 → mapped to CRF
  scale: number             // 1 | 0.75 | 0.5 | 0.25
  format: string            // 'mp4' | 'webm' | 'mov'
  trimStart?: number        // seconds, undefined = from beginning
  trimEnd?: number          // seconds, undefined = to end
  mergeAudioTracks?: boolean
  audioTrackCount?: number  // needed when mergeAudioTracks is true
}

interface Job {
  id: string
  type: JobType             // 'compress' | 'gif'
  name: string
  status: JobStatus         // 'queued' | 'running' | 'done' | 'error' | 'cancelled'
  progress: number          // 0–100
  inputPath: string
  outputPath: string
  inputSize: number
  outputSize?: number       // set after completion via fs.statSync
  createdAt: number
  completedAt?: number
  error?: string
  metadata: JobMetadata
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  maxParallelJobs: number   // 1–8
  outputDir: string | null  // null = same dir as input
  nvidiaCapturesPath: string | null
}
```

---

## IPC channels

| Channel | Type | Description |
|---|---|---|
| `jobs:add` | invoke | Add job, returns Job |
| `jobs:cancel` | send | Cancel job by id |
| `jobs:getAll` | invoke | Returns all jobs[] |
| `jobs:updated` | broadcast | Job state changed |
| `settings:get` | invoke | Returns AppSettings |
| `settings:set` | invoke | Partial update → new settings |
| `dialog:openFile` | invoke | File picker → `{path, name, size}` |
| `dialog:openDir` | invoke | Directory picker → string |
| `shell:showInFolder` | send | Reveal in Explorer |
| `shell:openPath` | send | Open with system default |
| `fs:listDir` | invoke | List video files in dir |
| `fs:listGames` | invoke | List subdirs with videos (Hub) |
| `fs:listVideos` | invoke | List videos sorted by date |
| `fs:deleteFolder` | invoke | Recursive delete |
| `fs:deleteFiles` | invoke | Delete specific files |
| `thumbnails:get` | invoke | Generate/cache thumbnail → path |
| `thumbnails:clearCache` | invoke | Delete all thumbnails |
| `thumbnails:cacheSize` | invoke | Total bytes |
| `thumbnails:cacheDir` | invoke | Cache directory path |
| `frames:get` | invoke | Generate timeline frames → paths[] |
| `probe:audioTracks` | invoke | Audio stream count → number |
| `covers:get` | invoke | Steam cover URL by game name |
| `media:port` | invoke | Media server port number |
| `window:minimize/maximize/close` | send | Window controls |
| `window:isMaximized` | invoke | boolean |
| `window:maximized` | broadcast | Maximize state changed |

---

## Renderer — pages

### `VideoEditor.tsx` — `/compress`, `/editor`
Two-panel resizable layout (left: video + trim, right: settings panel).

**Left panel:** `<video>` via media server URL + `TrimBar` component (frame strip thumbnails + draggable start/end handles). Play/pause, per-second nudge buttons, "Set end to playhead".

**Right panel:** Quality presets (Low/Medium/High/Original with estimated sizes), Resolution scale (1×/0.75×/0.5×/0.25× with pixel height label), Format buttons (mp4/webm/mov), Audio tracks section (appears only when `audioTrackCount > 1`: "First only" vs "Merge all").

On file load: probes audio tracks via `probe:audioTracks`, fetches timeline frames via `frames:get`.

File input: drag-drop (`webUtils.getPathForFile`) or `dialog:openFile`. Receives `location.state.file` when navigated from GameFolder.

### `Jobs.tsx` — `/jobs`
List of all jobs from `JobsContext`. Status badge, progress bar for running, cancel with inline confirm (Shift+click skips confirm).

### `JobDetail.tsx` — `/jobs/:id`
Two-panel: left = output video playback via media server, right = metadata (size reduction, duration, etc).

### `Hub.tsx` — `/hub`
Game library. Picks root folder, lists subdirectories containing videos. Shows Steam cover art. Click → GameFolder.

### `GameFolder.tsx` — `/hub/folder`
Lists videos in a game folder with thumbnails. Click → `/editor` with `state.file`.

### `Settings.tsx` — `/settings`
Theme toggle, maxParallelJobs slider (1–8), output directory picker, thumbnail cache size + clear, Nvidia captures path.

### `GifConverter.tsx` — `/gif`
Stub / not implemented.

### `VideoTest.tsx`, `VideoDebug.tsx`
Dev/debug pages, not part of production flow.

---

## Renderer — components

### `Layout.tsx`
Top-level shell: `TitleBar` + `SidebarProvider` + `AppSidebar` + `<Outlet />`. Sidebar open state persisted in `localStorage`.

### `TitleBar.tsx`
Custom title bar (h-9). Left: sidebar toggle + "VideoKit" brand. Right: minimize/maximize/close via IPC. Full bar = `WebkitAppRegion: drag`, buttons = `no-drag`.

### `AppSidebar` (`Sidebar.tsx`)
shadcn Sidebar, collapsible to icon-only. Nav: Home, Game Library, Compress, GIF, Jobs (with active count badge). Footer: Video Test, Video Debug, Settings.

### `JobsContext.tsx`
Loads all jobs on mount, subscribes to `jobs:updated` IPC. Exposes `{ jobs }` via `useJobs()`. Used by Sidebar (badge count) and Jobs/JobDetail pages.

---

## FFmpeg / prod build notes

`ffmpeg-static` and `ffprobe-static` are both in `asarUnpack` in `electron-builder.yml` — binaries are extracted outside `.asar` so they can be spawned. All path references use `.replace('app.asar', 'app.asar.unpacked')` at runtime (no-op in dev).

File path from drag-drop: `webUtils.getPathForFile(file)` — NOT `file.path` (undefined with context isolation). File picker: `dialog:openFile` IPC.

---

## Build

```bash
pnpm dev           # dev mode with HMR
pnpm build:win     # production Windows NSIS installer
pnpm build:unpack  # production unpacked dir (faster for testing)
pnpm typecheck     # tsc for both main and renderer
```
