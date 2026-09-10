# Astro Catalogue

Cross-platform (Windows + Ubuntu) Electron desktop app for Seestar astrophotographers.
It catalogues an existing astro-photo directory tree, helps plan upcoming sessions, and
imports new captures off the Seestar network share into that tree.

The app code lives at the repo root. A longer prose guide is `README.md`;
the original product requirements are `application.md`. This file is the working reference and
the source of the numbered conventions the code cites (e.g. "CLAUDE.md rule 10").

## What it does

- **Catalogue** — scan a root directory, list objects (grouped by Messier/NGC/IC/Caldwell),
  and show per-frame-type frame counts, total integration time, and disk usage. Card or table
  view, filter/sort, object detail popup with on-demand Wikipedia summary + thumbnail.
- **Planning** — for a configured observing location: altitude over the night, Moon separation
  and phase (window runs noon-to-noon), and frame-fit vs. the Seestar's field of view. Each
  rated Bad/Good/Perfect against configurable thresholds. Also proposes not-yet-shot objects
  from the bundled deep-sky lookup.
- **Seestar import** — connect to the telescope's network share, list capture sub-dirs, build
  and preview a copy plan that lays files into the catalogue structure, then copy.
- **Rename / merge** — rename a catalogue object or merge duplicate objects; both relocate
  files through the same directory-pattern logic as import (`electron/merge.ts`,
  `electron/rename.ts`).
- **Configuration** — every setting lives here (see rule 2), persisted to `localStorage`.

## How to run it

Prerequisite: **Node.js 22.5+** and npm only. No native deps, no C/C++ toolchain — `node:sqlite`
is used for storage.

```bash
npm install
npm run sample-data   # optional: generates sample-data/ (wipes it each run)
npm run dev           # Vite (renderer + main + preload, HMR) + launches Electron
```

Then in the app: **Select Root Directory** → pick a catalogue root (or the generated
`sample-data/`) → **Analyze**.

Other commands:

```bash
npm run build     # tsc -b + vite build -> dist/ (renderer) and dist-electron/ (main)
npm run lint      # oxlint
npm run package    # build + electron-builder (NSIS .exe on Windows; AppImage + .deb on Linux)
```

`electron-builder` does not cross-compile installers reliably — build each target on its own OS.
If `npm install` complains about scripts "not covered by allowScripts", run
`npm approve-scripts electron electron-winstaller` (both are pinned as approved in `package.json`).

## How it works

**Stack:** Electron 43 + React 19 + TypeScript + Tailwind 4, bundled by Vite via
`vite-plugin-electron`.

**Process split:**

- `electron/` — main process. `main.ts` registers all `ipcMain.handle`
  channels; `preload.ts` exposes them to the renderer as a typed API
  (`src/electron-api.d.ts`). Key modules: `scanner.ts` (walk the tree, parse folders,
  collect warnings), `db.ts` (`node:sqlite` cache in the OS app-data dir), `seestar.ts`
  (share discovery + copy planning), `merge.ts` / `rename.ts` (file relocation),
  `directory-pattern.ts` (the pattern tokenizer — see rule 3), `catalog.ts` /
  `file-types.ts` (classification), `shared-types.ts` (types + validators shared main↔renderer).
- `src/` — renderer. `App.tsx` holds top-level state and switches between the
  four sections (`components/AppNav.tsx`: `catalogue | planning | seestar | configuration`).
  `components/` are views/widgets; `lib/` is **shared pure logic** — astronomy math, ratings,
  grouping, formatting, duplicate detection (see rule 1, nothing calculation-y is duplicated
  across views). `lib/data/deepSkyCoordinates.json` (~1 MB, from OpenNGC + Wikipedia Caldwell)
  bundles coordinates / angular sizes / types so planning needs no network.

**Persistence:** scan results cache to SQLite (`~/.config/astro-catalogue/catalogue.db` on Linux,
`%APPDATA%\astro-catalogue\catalogue.db` on Windows) so startup is instant; re-scan only on
**Analyze**. UI settings live in `localStorage`.

**Network:** only optional Wikipedia summary/thumbnail lookups and an IP-based location fallback
(Chromium geolocation has no API key in prebuilt Electron).

**Data regeneration** (manual, rarely): `node scripts/generate-angular-sizes.mjs`,
`node scripts/generate-object-types.mjs`.

## Conventions (the numbered rules code refers to)

1. If there are same type calculations happening on more that one page (e.g. high of the object on the sky), there should external object/funtion, that should be responsible for calculating the result and it should be used in both places.
2. All configurations should be places on Configuration page, under appropriate panel.

### Import naming and placement rules

3. The catalogue directory layout is driven by a single configurable pattern string with 4 tokens: `{object}`, `{type}`, `{date}`, `{exposure}` (`electron/directory-pattern.ts`). The default pattern is `{object}/{type}/{date} {type} {exposure}`, e.g. `<root>/M 31/LP/2026.08.09 LP 20s/<files>`. Any code that builds or parses catalogue paths must go through this pattern (`applyDirectoryPattern` / `parseDirectoryPattern`), never hardcode the folder structure.
4. Token formats: `date` is `YYYY.MM.DD` (dot-separated); `exposure` is a number with trailing zeros trimmed followed by `s` (e.g. `20s`, `3.5s`); `type` is the capture mode/target name (e.g. `LP`, `IRCUT`, or a video target like `Lunar`), uppercased for still-image types.
5. An object folder named `<Object>_mosaic` is treated as object `<Object>` with `isMosaic = true` (`scanner.ts`). The `_mosaic` suffix is the only mosaic marker — do not introduce another convention for mosaics.
6. Seestar import only pulls from source subdirectories ending in `_sub` (deep-sky light frames) or `_video` (Sun/Moon/planetary clips); the object name is the subdirectory name with that suffix stripped (`electron/seestar.ts`).
7. Source file names must match a fixed pattern to be imported:
   - Light frames: `Light_<object>_<exposure>s_<IRCUT|LP>_<YYYYMMDD>-<HHMMSS>.<ext>`
   - Video clips: `<YYYY>-<MM>-<DD>-<HHMMSS>-<target>-RAW.<ext>` (exposure is fixed at `0s` since video frames don't count toward exposure totals)
   Files matching neither pattern are reported as invalid and are not imported.
8. On import, the original file name is preserved unchanged in the destination — Seestar import never renames files. Only merge (rule 10) renames files.
9. Auto-analysis (re-scan) after import/merge is always a **partial** re-scan restricted to the top-level object folders that were actually written to (`scanDirectories`/`scanner.ts`), not a full catalogue re-scan. This only runs when the import/merge target directory is the catalogue root; otherwise re-analysis is skipped.
10. Merging duplicate objects moves the "other" objects' files into the "main" object's folder tree using the same directory pattern as import. A file is renamed only if the source object's name appears as a whole word inside the file name, in which case it is swapped for the main object's name; otherwise the file name is left untouched. Destination collisions are skipped, and now-empty source folders are pruned after the move.
11. Duplicate-object detection (used by both the catalogue banner and the merge modal) groups objects that share the same bundled J2000 coordinates **and** the same mosaic status; this logic must stay centralized in one shared function (see rule 1) rather than duplicated per view.
