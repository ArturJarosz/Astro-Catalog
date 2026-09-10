# Astro Catalogue

A cross-platform desktop app (Windows + Ubuntu) for astrophotographers who
shoot with a **Seestar** smart telescope. It does three things:

1. **Catalogues** an existing photo directory tree — per object, per frame
   type: how many frames, how much integration time, how much disk space.
2. **Plans** upcoming sessions — object altitude over the night, Moon
   distance and phase, and how well an object fits the Seestar's field of
   view, all rated Bad / Good / Perfect against thresholds you configure.
3. **Imports** new captures straight off the Seestar's network share into
   your catalogue's directory structure.

Results are cached in a local SQLite database, so the app starts instantly
without rescanning — click **Analyze** when you want to refresh.

Built with Electron + React + TypeScript + Tailwind CSS, using Node's
built-in `node:sqlite` for storage. There are **no native dependencies**, so
nothing beyond Node.js/npm is needed to install, build, or package — no
C/C++ toolchain, no Visual Studio, on either OS. A packaged Windows
installer (`npm run package`) runs on a machine with no dev tools at all.

## Repository layout

```
electron/       Main process: scanner, SQLite storage, Seestar import, IPC
src/            React renderer
  components/   Views (Catalogue, Planning, Seestar, Configuration)
  lib/          Shared calculations (astronomy, ratings, grouping, format)
  lib/data/     Bundled deep-sky coordinate/size/type lookup (~1 MB JSON)
scripts/        Sample-data generator + data-refresh scripts
```

## Quick start

```bash
npm install
npm run sample-data   # optional, see below
npm run dev
```

`npm run dev` starts Vite (renderer + main + preload with HMR) and launches
the Electron window automatically.

### Prerequisites

Just **Node.js 22.5+** and npm. (`node:sqlite` has shipped in Node since
22.5 and is stable in the Node 24 that Electron bundles.)

**Ubuntu / Debian**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows** — install Node.js 22+ (LTS) from
[nodejs.org](https://nodejs.org/); the installer includes npm.

If `npm install` reports packages "not yet covered by allowScripts" (this
repo pins `electron` and `electron-winstaller` as approved — see the
`allowScripts` field in `package.json`), run:

```bash
npm approve-scripts electron electron-winstaller
```

## Sample data

Don't have a photo directory handy? Generate one:

```bash
npm run sample-data
```

This creates `sample-data/` containing:

- **M 31** — two frame types (`LP`, `IRCUT`) across two nights
- **M 42**, **NGC 7000**, **M 101**, **M 32** — single-type objects
- **M 31_mosaic** — a mosaic, tracked as its own object
- **M 51/LP/not-a-valid-session-name** and a stray `stray_notes.txt` —
  deliberately malformed, so the warnings panel has something to show

Then in the app: **Select Root Directory** → pick the generated
`sample-data` folder → click **Analyze**.

> The script deletes and recreates `sample-data/` on every run, so don't put
> anything you care about in there.

### Expected directory structure

The scanner (and the sample data) follows this layout:

```
{root}/
  M 31/
    LP/
      2026.08.09 LP 20s/       <- YYYY.MM.DD TYPE Ns, contains .fit/.fits files
    IRCUT/
      2026.08.09 IRCUT 20s/
  M 31_mosaic/                 <- mosaics are tracked as a separate object
    LP/
      2026.08.10 LP 30s/
```

Anything that doesn't match — unexpected files, session folders that don't
follow the `YYYY.MM.DD TYPE Ns` pattern — is reported in the app's warnings
panel instead of failing the scan.

## The four views

### Catalogue

The scanned objects, as cards or as a table. Grouped by catalog (Messier,
NGC, IC, Caldwell, …), filterable by name and frame type, sortable, with
selectable metric columns (frames, exposure, size). Clicking an object opens
a detail popup with per-session breakdown and a Wikipedia summary and
thumbnail fetched on demand.

### Planning

Answers "what should I shoot tonight?" For your configured observing
location it computes, per object:

- **Altitude** over the night (rise / transit / set, with night shading
  derived from Sun altitude)
- **Moon separation** and phase across the night window — which, note, runs
  noon-to-noon, not midnight-to-midnight
- **Frame fit** — the share of your Seestar model's field of view the
  object's angular size would fill, rated *Too small / Good / Good for
  mosaic / Too big*

It also proposes objects you *haven't* shot yet: entries from the bundled
deep-sky lookup that aren't in your catalogue, narrowed by whichever search
criteria you set (each is optional — unset criteria never exclude anything).

### Seestar

Connects to the telescope's network share
(`\\seestar\EMMC Images\MyWorks` on Windows,
`/mnt/seestar/EMMC Images/MyWorks` on Linux — both configurable), lists the
capture sub-directories it finds, and builds a copy plan that renames each
`Light_..._20s_LP_20260809-213000.fit` file into your catalogue's structure
using a configurable pattern (default
`{object}/{type}/{date} {type} {exposure}`). It shows what would be
overwritten before copying, and reports files that don't match the expected
Seestar naming.

### Configuration

Every setting lives here, split into **General** and **Planning** tabs:
Seestar source path, directory pattern, local object-image folder, Moon
panel, Moon-distance rating thresholds, altitude rating thresholds, frame
fit rating thresholds, and observing location. Settings persist in
`localStorage`. (The Seestar model used for frame-fit maths is picked from
the Planning view's toolbar, since you may want to compare models.)

## Data storage

The SQLite database lives in the OS-standard app-data directory and
persists between runs:

- Linux: `~/.config/astro-catalogue/catalogue.db`
- Windows: `%APPDATA%\astro-catalogue\catalogue.db`

Object coordinates, angular sizes, and types are **bundled** in
`src/lib/data/deepSkyCoordinates.json` — no network needed for planning.
That file is regenerated manually from OpenNGC (CC-BY-SA-4.0) and
Wikipedia's Caldwell catalogue article:

```bash
node scripts/generate-angular-sizes.mjs
node scripts/generate-object-types.mjs
```

The only runtime network calls are the optional Wikipedia summary/thumbnail
lookups in the object detail popup.

## Other commands

```bash
npm run build     # type-check + build renderer (dist/) and Electron (dist-electron/)
npm run lint      # oxlint
npm run preview   # preview the built renderer in a browser
npm run package   # build + electron-builder installer
```

`npm run package` produces an NSIS `.exe` on Windows and an `AppImage` +
`.deb` on Linux. electron-builder does not reliably cross-compile GUI
installers between the two, so build each target on its own OS (or via a CI
matrix). Since there are no native dependencies, the build machine just
needs Node/npm — the machine that later *runs* the installed app needs
nothing at all.

## Contributing conventions

See `CLAUDE.md` at the repo root:

1. Any calculation used on more than one page (object altitude, Moon
   separation, ratings, …) lives in a shared module under `src/lib/` and is
   imported by both — never duplicated.
2. All configuration belongs on the Configuration page, under an
   appropriate panel.

## Troubleshooting

- **Blank window on Linux in a VM** — GPU/vaapi warnings in the terminal are
  usually harmless; if the window stays blank, try
  `ELECTRON_DISABLE_GPU=1 npm run dev`.
- **Seestar shows as disconnected** — check the share is mounted and that
  the source path on Configuration → General matches your mount point.
