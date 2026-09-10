export type SeestarModel = 's30' | 's30-pro' | 's50' | 's50-pro'

export const SEESTAR_MODELS: { value: SeestarModel; label: string }[] = [
  { value: 's30', label: 'Seestar S30' },
  { value: 's30-pro', label: 'Seestar S30 Pro' },
  { value: 's50', label: 'Seestar S50' },
  { value: 's50-pro', label: 'Seestar S50 Pro' },
]

export const DEFAULT_SEESTAR_MODEL: SeestarModel = 's50'

/**
 * Imaging (tele lens) field of view in arcminutes, derived from each model's sensor size
 * and focal length (width × height, degrees, converted to arcmin):
 *  - S30: IMX662, 1920×1080px @ 2.9µm, 150mm FL -> 2.13° × 1.20°
 *  - S30 Pro: IMX585, 3840×2160px @ 2.9µm, 160mm FL -> 3.99° × 2.24°
 *  - S50: IMX462, 1936×1096px @ 2.9µm, 250mm FL -> 1.29° × 0.73°
 *  - S50 Pro: 3840×2160px @ 2.9µm, 260mm FL -> 2.45° × 1.38°
 * Cross-checked against ZWO's published diagonal FOV figures (2.46°, 4.6°, n/a, 2.8°).
 */
export const SEESTAR_FOV_ARCMIN: Record<SeestarModel, { widthArcmin: number; heightArcmin: number }> = {
  s30: { widthArcmin: 127.6, heightArcmin: 71.8 },
  's30-pro': { widthArcmin: 239.3, heightArcmin: 134.6 },
  s50: { widthArcmin: 77.4, heightArcmin: 43.8 },
  's50-pro': { widthArcmin: 147.3, heightArcmin: 82.8 },
}
