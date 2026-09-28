import type { ObjectInfo } from '../../electron/shared-types'
import type { AlternativeNamesDisplay } from '../lib/alternativeNamesDisplay'
import { getAlternativeNames } from '../lib/objectCoordinates'

interface ObjectNameProps {
  object: ObjectInfo
  alternativeNamesDisplay: AlternativeNamesDisplay
  showMosaic?: boolean
}

/**
 * An object's name plus its other catalogue designations (e.g. "M 31 · NGC 224"), shown the way
 * Configuration → General → Alternative names asks for. Shared by the card, table and detail views.
 */
export function ObjectName({ object, alternativeNamesDisplay, showMosaic = true }: ObjectNameProps) {
  const names = alternativeNamesDisplay === 'hidden' ? [] : getAlternativeNames(object.catalog, object.catalogNumber)
  const inTooltip = alternativeNamesDisplay === 'tooltip' && names.length > 0
  const inline = (alternativeNamesDisplay === 'inline' || alternativeNamesDisplay === 'wrap') && names.length > 0

  return (
    <span
      className={`${alternativeNamesDisplay === 'wrap' ? 'min-w-0 break-words' : 'truncate'}${inTooltip ? ' cursor-help' : ''}`}
      title={inTooltip ? `Also known as ${names.join(' / ')}` : undefined}
    >
      {object.name}
      {showMosaic && object.isMosaic && <span className="text-slate-300"> (Mosaic)</span>}
      {inline && <span className="font-normal text-slate-400"> · {names.join(' / ')}</span>}
    </span>
  )
}
