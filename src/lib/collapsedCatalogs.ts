import { useCallback, useEffect, useState } from 'react'

/**
 * Which catalog groups (Messier, NGC, …) the user has collapsed, persisted per list.
 * Each list that renders catalog groups passes its own storage key, so collapsing
 * Messier in the Catalogue tab does not also collapse it in the Planning proposals.
 */
export function useCollapsedCatalogs(storageKey: string) {
  const [collapsedCatalogs, setCollapsedCatalogs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...collapsedCatalogs]))
  }, [storageKey, collapsedCatalogs])

  const toggleCatalog = useCallback((catalog: string) => {
    setCollapsedCatalogs((previous) => {
      const next = new Set(previous)
      if (next.has(catalog)) {
        next.delete(catalog)
      } else {
        next.add(catalog)
      }
      return next
    })
  }, [])

  return { collapsedCatalogs, toggleCatalog }
}
