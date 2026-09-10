// Shared Bad/Good/Perfect rating logic for the Planning views (card, list, and
// thumbnail) so the Moon-distance and altitude panels are tinted identically
// everywhere they appear.

export type Rating = 'bad' | 'good' | 'perfect'

export function rate(enabled: boolean, value: number, goodThreshold: number, perfectThreshold: number): Rating | null {
  if (!enabled) return null
  return value < goodThreshold ? 'bad' : value < perfectThreshold ? 'good' : 'perfect'
}

export function panelClassFor(rating: Rating | null): string {
  if (rating === 'bad') return 'border-l-2 border-rose-400 bg-rose-400/10'
  if (rating === 'good') return 'border-l-2 border-amber-400 bg-amber-400/10'
  if (rating === 'perfect') return 'border-l-2 border-emerald-400 bg-emerald-400/10'
  return 'border-l-2 border-transparent bg-black/20'
}

export function textClassFor(rating: Rating | null): string {
  if (rating === 'bad') return 'text-rose-300'
  if (rating === 'good') return 'text-amber-300'
  if (rating === 'perfect') return 'text-emerald-300'
  return 'text-slate-300'
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}
