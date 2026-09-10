export interface CatalogMatch {
  catalog: string
  catalogNumber: number | null
}

interface CatalogPattern {
  catalog: string
  pattern: RegExp
}

const CATALOG_PATTERNS: CatalogPattern[] = [
  { catalog: 'Messier', pattern: /^M\s?(\d{1,3})$/i },
  { catalog: 'Caldwell', pattern: /^C(?:ald(?:well)?)?\s?(\d{1,3})$/i },
  { catalog: 'NGC', pattern: /^NGC\s?(\d{1,4})[A-Za-z]?$/i },
  { catalog: 'IC', pattern: /^IC\s?(\d{1,4})[A-Za-z]?$/i },
  { catalog: 'Abell', pattern: /^A(?:bell)?\s?(\d{1,4})$/i },
]

export function resolveCatalog(name: string): CatalogMatch {
  const trimmed = name.trim()

  for (const { catalog, pattern } of CATALOG_PATTERNS) {
    const match = pattern.exec(trimmed)
    if (match) {
      return { catalog, catalogNumber: Number.parseInt(match[1], 10) }
    }
  }

  return { catalog: 'Other', catalogNumber: null }
}
