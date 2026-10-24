import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_OBJECT_IMAGE_DISPLAY,
  MAX_OBJECT_IMAGE_ZOOM,
  type ObjectImageDisplay,
  type ObjectImageEntry,
} from '../../electron/shared-types'
import { clampCrop, panCrop, type CropDisplay } from '../lib/imageDisplay'
import { ObjectImageView } from './ObjectImageView'

interface ImageCropEditorProps {
  image: ObjectImageEntry
  onSave: (display: ObjectImageDisplay) => Promise<void>
  onClose: () => void
}

const ZOOM_WHEEL_STEP = 1.1

/** Lets the user show a picture whole, or drag / zoom to choose the square part that is shown. */
export function ImageCropEditor({ image, onSave, onClose }: ImageCropEditorProps) {
  const [mode, setMode] = useState<ObjectImageDisplay['mode']>(image.display.mode)
  const [crop, setCrop] = useState<CropDisplay>(
    image.display.mode === 'crop' ? image.display : (DEFAULT_OBJECT_IMAGE_DISPLAY as CropDisplay),
  )
  const [aspect, setAspect] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    // Capture phase + stopImmediatePropagation: Escape closes only this editor, not the
    // object detail modal underneath (which listens on window too).
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  const display: ObjectImageDisplay = mode === 'full' ? { mode: 'full' } : clampCrop(crop, aspect)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (mode !== 'crop') return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = dragRef.current
    const side = frameRef.current?.clientWidth
    if (!start || !side) return
    dragRef.current = { x: e.clientX, y: e.clientY }
    setCrop((current) => panCrop(current, aspect, (e.clientX - start.x) / side, (e.clientY - start.y) / side))
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (mode !== 'crop') return
    const factor = e.deltaY < 0 ? ZOOM_WHEEL_STEP : 1 / ZOOM_WHEEL_STEP
    setCrop((current) => clampCrop({ ...current, zoom: current.zoom * factor }, aspect))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await onSave(display)
      onClose()
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  const modeButton = (value: ObjectImageDisplay['mode'], label: string) => (
    <button
      onClick={() => setMode(value)}
      className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition ${
        mode === value ? 'bg-white/15 text-slate-100' : 'text-slate-300 hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="truncate text-lg font-semibold text-slate-100">Adjust “{image.fileName}”</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 p-5">
          <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            {modeButton('full', 'Full picture')}
            {modeButton('crop', 'Crop')}
          </div>

          <div
            ref={frameRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => (dragRef.current = null)}
            onPointerCancel={() => (dragRef.current = null)}
            onWheel={handleWheel}
            className={`aspect-square w-full touch-none overflow-hidden rounded-lg border border-white/10 bg-black/30 ${
              mode === 'crop' ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            <ObjectImageView url={image.url} alt={image.fileName} display={display} onAspect={setAspect} />
          </div>

          {mode === 'crop' ? (
            <>
              <label className="flex items-center gap-3 text-xs text-slate-300">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={MAX_OBJECT_IMAGE_ZOOM}
                  step={0.05}
                  value={crop.zoom}
                  onChange={(e) => setCrop((current) => clampCrop({ ...current, zoom: Number(e.target.value) }, aspect))}
                  className="flex-1"
                />
                <span className="w-10 text-right tabular-nums">{crop.zoom.toFixed(1)}×</span>
              </label>
              <p className="text-xs text-slate-400">Drag the picture to move it; scroll or use the slider to zoom.</p>
            </>
          ) : (
            <p className="text-xs text-slate-400">The whole picture is shown, with dark bars where it isn't square.</p>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-5 py-3">
          <button
            onClick={() => {
              setMode('crop')
              setCrop(DEFAULT_OBJECT_IMAGE_DISPLAY as CropDisplay)
            }}
            className="rounded-md px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10"
          >
            Reset
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:from-sky-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
