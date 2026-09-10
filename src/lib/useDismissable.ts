import { useEffect, useRef, type RefObject } from 'react'

/**
 * Closes an open popover when the user clicks outside `containerRef` or presses Escape.
 * Shared by every popover in the app so they all dismiss the same way.
 */
export function useDismissable(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void {
  // Held in a ref so an inline arrow callback does not re-subscribe on every render.
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  })

  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) dismissRef.current()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') dismissRef.current()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, containerRef])
}
