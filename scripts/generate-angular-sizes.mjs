// Backfills angular size (major/minor axis, arcmin) into the bundled deep-sky
// coordinates lookup. Run manually with: node scripts/generate-angular-sizes.mjs
//
// Sources:
//  - OpenNGC (github.com/mattiaverga/OpenNGC, CC-BY-SA-4.0) for NGC/IC major/minor
//    axis and NGC/IC <-> Messier cross-reference.
//  - Wikipedia's "Caldwell catalogue" article for the Caldwell <-> NGC/IC
//    cross-reference (Caldwell objects are aliases of NGC/IC objects, same as the
//    coordinates already bundled in deepSkyCoordinates.json).
//
// Only adds majorArcmin/minorArcmin to keys that already exist in the bundled
// JSON — never adds new catalog entries, never touches raDeg/decDeg.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const COORDS_PATH = path.join(__dirname, '..', 'src', 'lib', 'data', 'deepSkyCoordinates.json')

const NGC_CSV_URL = 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv'
const ADDENDUM_CSV_URL = 'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/addendum.csv'
const CALDWELL_WIKI_URL = 'https://en.wikipedia.org/w/index.php?title=Caldwell_catalogue&action=raw'

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.text()
}

/** Parses an OpenNGC-style `;`-delimited CSV into an array of row objects. */
function parseCsv(text) {
  const lines = text.trim().split('\n')
  const header = lines[0].split(';')
  return lines.slice(1).map((line) => {
    const cells = line.split(';')
    const row = {}
    header.forEach((key, i) => (row[key] = cells[i] ?? ''))
    return row
  })
}

/** Normalizes an OpenNGC `Name` (e.g. "NGC0224", "IC1000") to our key format ("NGC:224"). */
function ngcNameToKey(name) {
  const m = /^(NGC|IC)0*(\d+)/.exec(name)
  if (!m) return null
  return `${m[1]}:${Number(m[2])}`
}

function buildSizeIndex(rows) {
  // key ("NGC:224") -> { majorArcmin, minorArcmin }, plus messierNumber -> same object
  const byKey = new Map()
  const byMessier = new Map()
  for (const row of rows) {
    const majorArcmin = Number.parseFloat(row.MajAx)
    if (!Number.isFinite(majorArcmin)) continue
    const minorArcminRaw = Number.parseFloat(row.MinAx)
    const size = {
      majorArcmin: Math.round(majorArcmin * 10) / 10,
      ...(Number.isFinite(minorArcminRaw) ? { minorArcmin: Math.round(minorArcminRaw * 10) / 10 } : {}),
    }
    const key = ngcNameToKey(row.Name)
    if (key) byKey.set(key, size)
    if (row.M) {
      for (const m of row.M.split(',').map((s) => s.trim()).filter(Boolean)) {
        byMessier.set(Number(m), size)
      }
    }
  }
  return { byKey, byMessier }
}

/** Parses the Caldwell wikitable, returning Caldwell number -> NGC/IC key ("NGC:188"). */
function parseCaldwellCrossReference(wikitext) {
  const map = new Map()
  const tableStart = wikitext.indexOf('Caldwell number')
  if (tableStart === -1) throw new Error('Could not locate Caldwell table in wiki markup')
  const table = wikitext.slice(tableStart)
  const rows = table.split(/\n\|-/)
  for (const row of rows) {
    const cNumMatch = /\{\{hs\|\d+\}\}C(\d+)/.exec(row)
    const ngcMatch = /\[\[(NGC|IC)\s?0*(\d+)/.exec(row)
    if (cNumMatch && ngcMatch) {
      map.set(Number(cNumMatch[1]), `${ngcMatch[1]}:${Number(ngcMatch[2])}`)
    }
  }
  return map
}

async function main() {
  console.log('Fetching OpenNGC data…')
  const [ngcCsv, addendumCsv, caldwellWiki] = await Promise.all([
    fetchText(NGC_CSV_URL),
    fetchText(ADDENDUM_CSV_URL),
    fetchText(CALDWELL_WIKI_URL),
  ])

  const rows = [...parseCsv(ngcCsv), ...parseCsv(addendumCsv)]
  const { byKey, byMessier } = buildSizeIndex(rows)
  console.log(`Parsed ${rows.length} OpenNGC rows, ${byKey.size} with usable size data.`)

  const caldwellToNgc = parseCaldwellCrossReference(caldwellWiki)
  console.log(`Resolved ${caldwellToNgc.size} Caldwell -> NGC/IC cross-references.`)

  const coordinates = JSON.parse(fs.readFileSync(COORDS_PATH, 'utf-8'))

  let updated = 0
  for (const key of Object.keys(coordinates)) {
    const [catalog, numberStr] = key.split(':')
    const number = Number(numberStr)
    let size = null
    if (catalog === 'NGC' || catalog === 'IC') {
      size = byKey.get(key) ?? null
    } else if (catalog === 'Messier') {
      size = byMessier.get(number) ?? null
    } else if (catalog === 'Caldwell') {
      const ngcKey = caldwellToNgc.get(number)
      size = ngcKey ? byKey.get(ngcKey) ?? null : null
    }
    if (size) {
      Object.assign(coordinates[key], size)
      updated++
    }
  }

  fs.writeFileSync(COORDS_PATH, JSON.stringify(coordinates))
  const total = Object.keys(coordinates).length
  console.log(`Updated ${updated} / ${total} entries with angular size data.`)

  for (const [label, key] of [
    ['M31 (Andromeda)', 'Messier:31'],
    ['M42 (Orion Nebula)', 'Messier:42'],
    ['Caldwell 14 (Double Cluster)', 'Caldwell:14'],
  ]) {
    console.log(`  ${label}:`, coordinates[key])
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
