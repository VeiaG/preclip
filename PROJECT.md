# VideoKit

Desktop app for video processing. Built with Electron + React + TypeScript + Tailwind CSS + shadcn/ui.

## What we're building

A collection of video tools in one clean desktop app. Each tool is a separate page accessible from the sidebar.

### Tools planned

| Tool | Status | Description |
|------|--------|-------------|
| Video Compress | UI done, logic pending | Reduce file size with quality/scale/format controls |
| GIF Converter | Stub | Convert video clips to animated GIFs |

## Current state

The UI is fully stubbed out — navigation, theming, layouts, and controls are in place. No real video processing logic yet (no FFmpeg integration). The compression progress is faked with a timer.

## Stack

- **Electron** — desktop shell
- **React 19 + TypeScript** — renderer
- **Tailwind CSS v4** — styling
- **shadcn/ui** (base-ui variant) — components: Button, Slider, Sidebar, Resizable, Tooltip, Separator
- **React Router v7** (MemoryRouter) — in-app navigation
- **electron-vite** — build tooling

## Architecture

```
src/
├── main/           Electron main process
├── preload/        Preload bridge
└── renderer/src/
    ├── context/    ThemeContext (light / dark / system)
    ├── components/
    │   ├── layout/ Layout + AppSidebar (shadcn collapsible sidebar)
    │   └── ui/     shadcn components
    └── pages/
        ├── Home.tsx        Tool picker dashboard
        ├── Compress.tsx    Video compression (resizable preview + settings)
        ├── GifConverter.tsx  Coming soon stub
        └── Settings.tsx    Theme switcher + output folder
```

## Next steps

- Integrate FFmpeg (likely via `fluent-ffmpeg` or direct child_process) for real compression
- Wire up IPC between renderer and main process to run FFmpeg jobs
- Implement GIF converter page
- Add output folder picker (Settings page)
- Job history / queue
