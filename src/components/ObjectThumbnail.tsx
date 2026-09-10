import type { ObjectInfo } from '../../electron/shared-types'
import { useObjectImage } from '../lib/useObjectImage'

interface ObjectThumbnailProps {
  object: ObjectInfo
  imagesPath: string
}

export function ObjectThumbnail({ object, imagesPath }: ObjectThumbnailProps) {
  const { imageUrl } = useObjectImage(object, imagesPath, false)

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/30">
      {imageUrl ? (
        <img src={imageUrl} alt={object.name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-[10px] text-slate-400">—</span>
      )}
    </div>
  )
}
