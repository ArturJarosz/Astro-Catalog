import type { ObjectInfo } from '../../electron/shared-types'
import { notifyObjectImagesChanged } from './useObjectImage'

/**
 * After a rename or merge moved `movedObjects` into the object called `toName`, carries their
 * pictures in the Object images folder over to the new name. Pictures are copied rather than
 * moved when another catalogue object (e.g. the `_mosaic` sibling) still uses the old name.
 * Shared by RenameObjectModal and MergeTargetsModal. Returns an error message, or null.
 */
export async function relocateObjectImagesAfterMove(
  imagesPath: string,
  movedObjects: ObjectInfo[],
  toName: string,
  allObjects: ObjectInfo[],
): Promise<string | null> {
  if (!imagesPath) return null
  const movedPaths = new Set(movedObjects.map((object) => object.path))
  const fromNames = [...new Set(movedObjects.map((object) => object.name))]
  try {
    for (const fromName of fromNames) {
      const stillUsed = allObjects.some((object) => object.name === fromName && !movedPaths.has(object.path))
      await window.astroCatalogue.relocateObjectImages(imagesPath, fromName, toName, stillUsed)
    }
    return null
  } catch (e) {
    return `Files were moved, but the object pictures could not be: ${String(e)}`
  } finally {
    notifyObjectImagesChanged()
  }
}
