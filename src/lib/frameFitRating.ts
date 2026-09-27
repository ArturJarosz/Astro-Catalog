// Shared Too small/Good/Good for mosaic/Too big rating for how much of a Seestar's
// frame an object's angular size fills, so the Planning views (card, list, and detail
// popup) tint it identically everywhere it appears.

export type FrameFitRating = 'too-small' | 'good' | 'good-for-mosaic' | 'too-big'

export function rateFrameFit(
  enabled: boolean,
  framePortionPercent: number | null,
  goodThresholdPercent: number,
  mosaicThresholdPercent: number,
  tooBigThresholdPercent: number,
): FrameFitRating | null {
  if (!enabled || framePortionPercent === null) return null
  if (framePortionPercent < goodThresholdPercent) return 'too-small'
  if (framePortionPercent < mosaicThresholdPercent) return 'good'
  if (framePortionPercent < tooBigThresholdPercent) return 'good-for-mosaic'
  return 'too-big'
}

export function panelClassFor(rating: FrameFitRating | null): string {
  if (rating === 'too-small') return 'border-l-2 border-amber-400 bg-amber-400/10'
  if (rating === 'good') return 'border-l-2 border-emerald-400 bg-emerald-400/10'
  if (rating === 'good-for-mosaic') return 'border-l-2 border-sky-400 bg-sky-400/10'
  if (rating === 'too-big') return 'border-l-2 border-rose-400 bg-rose-400/10'
  return 'border-l-2 border-transparent bg-black/20'
}

export function textClassFor(rating: FrameFitRating | null): string {
  if (rating === 'too-small') return 'text-amber-300'
  if (rating === 'good') return 'text-emerald-300'
  if (rating === 'good-for-mosaic') return 'text-sky-300'
  if (rating === 'too-big') return 'text-rose-300'
  return 'text-slate-300'
}

export function labelFor(rating: FrameFitRating | null): string {
  if (rating === 'too-small') return 'Too small'
  if (rating === 'good') return 'Good'
  if (rating === 'good-for-mosaic') return 'Good for mosaic'
  if (rating === 'too-big') return 'Too big'
  return ''
}
