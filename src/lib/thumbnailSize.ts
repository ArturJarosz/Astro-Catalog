// Size of the object pictures in the thumbnail list view — user-configurable in
// Configuration → General.
export type ThumbnailSize = 'small' | 'medium' | 'large' | 'xlarge'

export const THUMBNAIL_SIZE_PX: Record<ThumbnailSize, number> = {
  small: 40,
  medium: 64,
  large: 96,
  xlarge: 128,
}

export const THUMBNAIL_SIZE_LABELS: Record<ThumbnailSize, string> = {
  small: 'Small (40 px)',
  medium: 'Medium (64 px)',
  large: 'Large (96 px)',
  xlarge: 'Extra large (128 px)',
}

export const DEFAULT_THUMBNAIL_SIZE: ThumbnailSize = 'small'

export function parseThumbnailSize(stored: string | null): ThumbnailSize {
  return stored !== null && stored in THUMBNAIL_SIZE_PX ? (stored as ThumbnailSize) : DEFAULT_THUMBNAIL_SIZE
}
