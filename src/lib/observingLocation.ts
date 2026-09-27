/**
 * The observer's position on Earth. Used by every altitude, visibility and
 * moon-separation calculation, so it is configured once for the whole app
 * rather than per panel.
 */
export interface ObservingLocation {
  latitude: number
  longitude: number
}

export const OBSERVING_LOCATION_STORAGE_KEY = 'observingLocation'
