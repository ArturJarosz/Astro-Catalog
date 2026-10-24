import { MAX_OBJECT_IMAGE_ZOOM, type ObjectImageDisplay } from '../../electron/shared-types'

export type CropDisplay = Extract<ObjectImageDisplay, { mode: 'crop' }>

/** Picture size and offset inside a square slot, all as fractions of the slot's side. */
export interface CropLayout {
  width: number
  height: number
  left: number
  top: number
}

/** Rendered size of the picture at `zoom`, in slot sides (zoom 1 = the short side fills the slot). */
function scaledSize(zoom: number, aspect: number): { width: number; height: number } {
  return aspect >= 1 ? { width: zoom * aspect, height: zoom } : { width: zoom, height: zoom / aspect }
}

/** Keeps zoom in range and the crop square inside the picture. `aspect` is width / height. */
export function clampCrop(display: CropDisplay, aspect: number): CropDisplay {
  const zoom = Math.min(MAX_OBJECT_IMAGE_ZOOM, Math.max(1, display.zoom))
  const { width, height } = scaledSize(zoom, aspect)
  const clampAxis = (center: number, size: number) => Math.min(1 - 0.5 / size, Math.max(0.5 / size, center))
  return { mode: 'crop', zoom, centerX: clampAxis(display.centerX, width), centerY: clampAxis(display.centerY, height) }
}

/**
 * Where to place the picture inside a square slot so the slot shows the crop. Shared by the
 * thumbnails, the detail modal and the crop editor so they all frame a picture the same way.
 */
export function cropLayout(display: CropDisplay, aspect: number): CropLayout {
  const clamped = clampCrop(display, aspect)
  const { width, height } = scaledSize(clamped.zoom, aspect)
  return { width, height, left: 0.5 - clamped.centerX * width, top: 0.5 - clamped.centerY * height }
}

/** Moves the crop centre by a drag of (dx, dy) slot sides, dragging the picture with the pointer. */
export function panCrop(display: CropDisplay, aspect: number, dx: number, dy: number): CropDisplay {
  const { width, height } = scaledSize(display.zoom, aspect)
  return clampCrop({ ...display, centerX: display.centerX - dx / width, centerY: display.centerY - dy / height }, aspect)
}
