import type { AstroCatalogueApi } from '../electron/shared-types'

declare global {
  interface Window {
    astroCatalogue: AstroCatalogueApi
  }
}

export {}
