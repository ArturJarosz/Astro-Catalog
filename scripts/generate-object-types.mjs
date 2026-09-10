// Backfills object type (galaxy, nebula, cluster, etc.) into the bundled deep-sky
// coordinates lookup. Run manually with: node scripts/generate-object-types.mjs
//
// Sources:
//  - OpenNGC (github.com/mattiaverga/OpenNGC, CC-BY-SA-4.0) for NGC/IC object type
//    and NGC/IC <-> Messier cross-reference.
//  - Wikipedia's "Caldwell catalogue" article for the Caldwell <-> NGC/IC
//    cross-reference (Caldwell objects are aliases of NGC/IC objects, same as the
//    coordinates already bundled in deepSkyCoordinates.json).
//
// Only sets/clears a `type` field (raw OpenNGC type code, see src/lib/objectType.ts for
// the label mapping) on keys that already exist in the bundled JSON — never adds new
// catalog entries, never touches raDeg/decDeg/majorArcmin/minorArcmin. Re-derives every
// key's type from scratch each run (clearing any stale value) so it's safe to re-run.

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

// "Dup" (duplicate catalogue entry) and "NonEx" (nonexistent object) describe the status of
// the *row itself*, not the object it cross-references — e.g. addendum.csv has a "M102" row
// typed "Dup" whose M cross-reference points at 101 (the historical M101/M102 controversy).
// Letting that donate its type would stamp the real M101 (NGC 5457, a galaxy) as "duplicate".
const NON_DONATING_TYPES = new Set(['Dup', 'NonEx'])

function buildTypeIndex(rows) {
  // key ("NGC:224") -> OpenNGC type code, plus messierNumber -> same code
  const byKey = new Map()
  const byMessier = new Map()
  for (const row of rows) {
    const type = row.Type?.trim()
    if (!type || NON_DONATING_TYPES.has(type)) continue
    const key = ngcNameToKey(row.Name)
    if (key) byKey.set(key, type)
    if (row.M) {
      for (const m of row.M.split(',').map((s) => s.trim()).filter(Boolean)) {
        byMessier.set(Number(m), type)
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
  const { byKey, byMessier } = buildTypeIndex(rows)
  console.log(`Parsed ${rows.length} OpenNGC rows, ${byKey.size} with a usable type.`)

  const caldwellToNgc = parseCaldwellCrossReference(caldwellWiki)
  console.log(`Resolved ${caldwellToNgc.size} Caldwell -> NGC/IC cross-references.`)

  const coordinates = JSON.parse(fs.readFileSync(COORDS_PATH, 'utf-8'))

  let updated = 0
  for (const key of Object.keys(coordinates)) {
    const [catalog, numberStr] = key.split(':')
    const number = Number(numberStr)
    let type = null
    if (catalog === 'NGC' || catalog === 'IC') {
      type = byKey.get(key) ?? null
    } else if (catalog === 'Messier') {
      type = byMessier.get(number) ?? null
    } else if (catalog === 'Caldwell') {
      const ngcKey = caldwellToNgc.get(number)
      type = ngcKey ? byKey.get(ngcKey) ?? null : null
    }
    if (type) {
      coordinates[key].type = type
      updated++
    } else {
      delete coordinates[key].type
    }
  }

  fs.writeFileSync(COORDS_PATH, JSON.stringify(coordinates))
  const total = Object.keys(coordinates).length
  console.log(`Updated ${updated} / ${total} entries with a type.`)

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
