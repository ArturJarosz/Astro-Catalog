// How an object's other catalogue designations (e.g. "NGC 224" for M 31) are shown next to its
// name — user-configurable in Configuration → General.
export type AlternativeNamesDisplay = 'hidden' | 'tooltip' | 'inline' | 'wrap'

export const ALTERNATIVE_NAMES_DISPLAY_LABELS: Record<AlternativeNamesDisplay, string> = {
  hidden: "Don't show",
  tooltip: 'In a tooltip on the name',
  inline: 'Next to the name (single line)',
  wrap: 'Next to the name (wrap onto more lines)',
}

export const DEFAULT_ALTERNATIVE_NAMES_DISPLAY: AlternativeNamesDisplay = 'inline'

export function parseAlternativeNamesDisplay(stored: string | null): AlternativeNamesDisplay {
  return stored !== null && stored in ALTERNATIVE_NAMES_DISPLAY_LABELS
    ? (stored as AlternativeNamesDisplay)
    : DEFAULT_ALTERNATIVE_NAMES_DISPLAY
}
