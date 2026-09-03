# PreClip

<img width="900" height="670" alt="image" src="https://github.com/user-attachments/assets/4f2cd07b-897b-474e-9c94-0df9f19f902f" />


A desktop video clip manager and converter for gameplay captures. Point it at your
NVIDIA captures folder and it turns a pile of `.mp4` files into a browsable library
you can trim, compress and convert without leaving the app.

Built with Electron, React and a bundled FFmpeg — nothing to install separately.

## Features

**Game Library** — reads your captures folder, groups recordings by game with Steam
cover art, and shows every clip as a thumbnail grid with sorting, multi-select and
delete.

**Cover art you control** — covers come from Steam automatically, and when the match
is wrong or missing you can drop an image straight onto a game card, pick a file,
paste from the clipboard, or search Steam again under a different name and choose the
right game from the results. Whatever you supply is re-encoded to the grid's capsule
format, so it fills the card without stretching.

**Clip badges** — files PreClip produced are stamped with a `comment=PreClip`
metadata tag at encode time, so they carry a `CLIP` or `GIF` badge in the library and
stay recognisable even after you rename or move them. A `Show: All / Originals /
Clips` filter hides one or the other. Files made before this existed are still
detected by their `_clip` / `_compressed` suffix.

**Trim & compress** — a frame-strip timeline for setting in/out points, quality and
resolution presets with live size estimates, output as MP4, WebM or MOV. Multi-track
captures (game audio + mic) can be merged into one track.

**GIF converter** — frame rate, width, palette size, dither and loop mode, with a
single-frame preview rendered through the same palette pipeline as the final GIF, so
what you see is the real colour banding rather than a clean video frame.

**Job queue** — conversions run in the background with live progress, cancellation
and a configurable number of parallel jobs.

<img width="900" height="670" alt="image" src="https://github.com/user-attachments/assets/d20f2527-fc71-498b-a310-a0d6eaef80a5" />


## Stack

| Layer | Technology |
|---|---|
| Runtime | Electron 39 |
| Build | electron-vite 5, Vite 7 |
| UI | React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui |
| Media | `ffmpeg-static` + `ffprobe-static` + `fluent-ffmpeg` |
| Packaging | electron-builder |

See [Project.md](Project.md) for the architecture reference — module responsibilities,
shared types and the full IPC channel list.

## Project setup

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Type checking and linting

```bash
pnpm typecheck
pnpm lint
```

### Build

```bash
# Windows
pnpm build:win

# macOS
pnpm build:mac

# Linux
pnpm build:linux
```

Installers land in `dist/`. Use `pnpm build:unpack` for an unpacked build in
`dist/win-unpacked/` when you want to check packaging without producing an installer.

## Cutting a release

Publishing a GitHub release builds the Windows installer and attaches it, via
`.github/workflows/release.yml`.

1. Bump `version` in `package.json` and commit it.
2. Tag that commit and push the tag: `git tag v1.1.0 && git push origin v1.1.0`.
3. Publish a GitHub release for the tag (`gh release create v1.1.0 --generate-notes`).

The workflow checks the tag against `package.json` first and fails if they differ —
electron-builder names artifacts from `package.json`, not from the tag, so a mismatch
would otherwise attach `preclip-1.0.0-setup.exe` to release `v1.1.0`.

It uploads the installer, its blockmap and `latest.yml`. Nothing reads `latest.yml`
yet: `electron-updater` is a dependency but no auto-update is wired up in the main
process. The publishing side is ready for whenever it is.

Builds are unsigned, so Windows SmartScreen warns on first run.

## First run

Open **Settings** and set the **NVIDIA captures folder** to the directory holding your
per-game recording subfolders. Until that is set, the Game Library has nothing to show.

Two other settings worth knowing:

- **Start page** — which screen the app opens on. Defaults to Game Library.
- **Output folder** — where converted files go. Defaults to the source file's own folder.

## Application icons

The icon source of truth is `resources/icon.png` (512×512), which is also what the dev
window uses at runtime. electron-builder packages the icons from `build/` instead:
`icon.ico` for Windows, `icon.icns` for macOS, `icon.png` for Linux.

**Changing the icon means regenerating all three** — editing only `resources/icon.png`
updates the dev window while installed builds keep shipping the old art.
