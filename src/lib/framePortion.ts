import { SEESTAR_FOV_ARCMIN, type SeestarModel } from './seestarModel'

/**
 * Portion of a Seestar's frame an object's angular size would occupy, as a percentage of
 * frame area. Object footprint is modelled as an ellipse (major/minor axis); if minor axis
 * is unknown, the object is treated as circular. Returns null if size data is unavailable.
 */
export function getFramePortionPercent(
  majorArcmin: number | undefined,
  minorArcmin: number | undefined,
  model: SeestarModel,
): number | null {
  if (majorArcmin === undefined) return null
  const minor = minorArcmin ?? majorArcmin
  const objectAreaArcmin2 = Math.PI * (majorArcmin / 2) * (minor / 2)
  const frame = SEESTAR_FOV_ARCMIN[model]
  const frameAreaArcmin2 = frame.widthArcmin * frame.heightArcmin
  return (objectAreaArcmin2 / frameAreaArcmin2) * 100
}
