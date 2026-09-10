// Generates a sample astrophoto directory tree so you can try the app
// without your own data. Run with: npm run sample-data
//
// Creates ./sample-data (next to this project) with a couple of valid
// objects, a mosaic, and a couple of intentionally malformed entries so
// the warnings panel has something to show too.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'sample-data')

function makeFrames(dir, count, ext = '.fit') {
  fs.mkdirSync(dir, { recursive: true })
  for (let i = 1; i <= count; i++) {
    fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(3, '0')}${ext}`), '')
  }
}

console.log(`Generating sample data at ${OUT_DIR} ...`)

if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true })
}

// M 31 — a normal object with two frame types
makeFrames(path.join(OUT_DIR, 'M 31', 'LP', '2026.08.09 LP 20s'), 25, '.fit')
makeFrames(path.join(OUT_DIR, 'M 31', 'IRCUT', '2026.08.09 IRCUT 20s'), 18, '.fits')
makeFrames(path.join(OUT_DIR, 'M 31', 'LP', '2026.08.10 LP 20s'), 12, '.fit')

// M 42 — another object, single frame type, multiple sessions
makeFrames(path.join(OUT_DIR, 'M 42', 'LP', '2026.07.15 LP 30s'), 40, '.fit')
makeFrames(path.join(OUT_DIR, 'M 42', 'LP', '2026.07.16 LP 30s'), 35, '.fit')

// M 31_mosaic — tracked as a separate, mosaic-flagged object
makeFrames(path.join(OUT_DIR, 'M 31_mosaic', 'LP', '2026.08.20 LP 30s'), 15, '.fit')

// NGC 7000 — a longer single-frame-type object
makeFrames(path.join(OUT_DIR, 'NGC 7000', 'LP', '2026.06.01 LP 60s'), 20, '.fit')

// M 101 — used to exercise natural/numeric name sorting against M 31 and M 32
makeFrames(path.join(OUT_DIR, 'M 101', 'LP', '2026.05.12 LP 30s'), 22, '.fit')

// M 32 — a small companion object, single short session
makeFrames(path.join(OUT_DIR, 'M 32', 'LP', '2026.08.11 LP 20s'), 10, '.fit')

// Intentionally malformed entries, to demonstrate the warnings panel:
fs.mkdirSync(path.join(OUT_DIR, 'M 51', 'LP', 'not-a-valid-session-name'), { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 'M 51', 'LP', 'not-a-valid-session-name', 'frame_001.fit'), '')
fs.writeFileSync(path.join(OUT_DIR, 'stray_notes.txt'), 'this file should trigger a root-level warning')

console.log('Done. Point the app at this folder:')
console.log(OUT_DIR)
