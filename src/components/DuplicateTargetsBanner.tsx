interface DuplicateTargetsBannerProps {
  groupCount: number
  onReview: () => void
  onDismiss: () => void
}

/**
 * Catalogue-tab notice that the same physical target was imported into more than one folder
 * (e.g. once as "M 31", once as "NGC 224"), splitting its integration time. Opens the merge
 * modal so the user can fold them into one folder.
 */
export function DuplicateTargetsBanner({ groupCount, onReview, onDismiss }: DuplicateTargetsBannerProps) {
  if (groupCount === 0) return null

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
      <span className="text-amber-400">⚠</span>
      <span className="min-w-0 flex-1">
        {groupCount === 1
          ? '1 target appears in your catalogue under more than one label'
          : `${groupCount} targets appear in your catalogue under more than one label`}
        {' — '}files for the same object were imported into separate folders.
      </span>
      <button
        onClick={onReview}
        className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-400/20"
      >
        Review &amp; merge
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-amber-300/80 transition hover:bg-amber-400/10 hover:text-amber-100"
      >
        ✕
      </button>
    </div>
  )
}
