// Human-readable labels for OpenNGC's object type codes.
// See https://github.com/mattiaverga/OpenNGC/blob/master/NGC_guide.txt
const OBJECT_TYPE_LABELS: Record<string, string> = {
  '*': 'Star',
  '**': 'Double star',
  '*Ass': 'Star association',
  OCl: 'Open cluster',
  GCl: 'Globular cluster',
  'Cl+N': 'Cluster + nebula',
  G: 'Galaxy',
  GPair: 'Galaxy pair',
  GTrpl: 'Galaxy triplet',
  GGroup: 'Galaxy group',
  PN: 'Planetary nebula',
  HII: 'HII region',
  DrkN: 'Dark nebula',
  EmN: 'Emission nebula',
  Neb: 'Nebula',
  RfN: 'Reflection nebula',
  SNR: 'Supernova remnant',
  Nova: 'Nova',
  NonEx: 'Nonexistent object',
  Dup: 'Duplicate object',
  Other: 'Other',
}

/** Human-readable label for a bundled OpenNGC type code, e.g. "G" -> "Galaxy". Null if unknown/absent. */
export function labelForObjectType(type: string | undefined): string | null {
  if (!type) return null
  return OBJECT_TYPE_LABELS[type] ?? type
}

/**
 * Type codes offered as Propositions filter options — every OpenNGC type except "NonEx"
 * (nonexistent object) and "Dup" (duplicate catalogue entry), which aren't real imaging
 * targets. Ordered galaxies, then clusters, then nebulae, then everything else.
 */
export const FILTERABLE_OBJECT_TYPES = [
  'G',
  'GPair',
  'GTrpl',
  'GGroup',
  'OCl',
  'GCl',
  '*Ass',
  'Cl+N',
  'PN',
  'HII',
  'EmN',
  'RfN',
  'Neb',
  'DrkN',
  'SNR',
  '*',
  '**',
  'Nova',
  'Other',
] as const
