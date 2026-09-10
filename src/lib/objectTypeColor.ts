import { FILTERABLE_OBJECT_TYPES } from './objectType'

/** Hue families the palette is grouped by in the colour picker. */
export type ObjectTypeColorGroup = 'Warm' | 'Green' | 'Blue' | 'Purple & pink' | 'Neutral'

/** Every hue offered, in hue order. Names are persisted, so they may be added to but never renamed. */
const HUE_NAMES = [
  'rose',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'slate',
  'stone',
] as const

/** A Tailwind palette name — also the persisted key of that hue's base shade. */
export type ObjectTypeHue = (typeof HUE_NAMES)[number]

interface HueDefinition {
  hue: ObjectTypeHue
  label: string
  group: ObjectTypeColorGroup
}

const HUES: HueDefinition[] = [
  { hue: 'rose', label: 'Rose', group: 'Warm' },
  { hue: 'red', label: 'Red', group: 'Warm' },
  { hue: 'orange', label: 'Orange', group: 'Warm' },
  { hue: 'amber', label: 'Amber', group: 'Warm' },
  { hue: 'yellow', label: 'Yellow', group: 'Warm' },
  { hue: 'lime', label: 'Lime', group: 'Green' },
  { hue: 'green', label: 'Green', group: 'Green' },
  { hue: 'emerald', label: 'Emerald', group: 'Green' },
  { hue: 'teal', label: 'Teal', group: 'Green' },
  { hue: 'cyan', label: 'Cyan', group: 'Blue' },
  { hue: 'sky', label: 'Sky', group: 'Blue' },
  { hue: 'blue', label: 'Blue', group: 'Blue' },
  { hue: 'indigo', label: 'Indigo', group: 'Blue' },
  { hue: 'violet', label: 'Violet', group: 'Purple & pink' },
  { hue: 'purple', label: 'Purple', group: 'Purple & pink' },
  { hue: 'fuchsia', label: 'Fuchsia', group: 'Purple & pink' },
  { hue: 'pink', label: 'Pink', group: 'Purple & pink' },
  { hue: 'slate', label: 'Grey', group: 'Neutral' },
  { hue: 'stone', label: 'Warm grey', group: 'Neutral' },
]

export type ObjectTypeShade = 'light' | 'base' | 'deep'

interface ShadeDefinition {
  label: string
  /** Tailwind steps for the badge's text, translucent fill, border, and the picker swatch. */
  text: number
  fill: number
  fillAlpha: number
  border: number
  borderAlpha: number
  swatch: number
}

/**
 * The three brightness steps every hue is offered in. The text steps were chosen so that
 * even the deepest one clears WCAG AA (4.5:1) against the card background for every hue —
 * indigo is the tightest at 4.7:1.
 */
const SHADES: Record<ObjectTypeShade, ShadeDefinition> = {
  light: { label: 'Light', text: 200, fill: 300, fillAlpha: 15, border: 300, borderAlpha: 40, swatch: 300 },
  base: { label: 'Base', text: 300, fill: 400, fillAlpha: 10, border: 400, borderAlpha: 30, swatch: 400 },
  deep: { label: 'Deep', text: 400, fill: 500, fillAlpha: 15, border: 500, borderAlpha: 40, swatch: 600 },
}

export const OBJECT_TYPE_SHADES: ObjectTypeShade[] = ['light', 'base', 'deep']

export const OBJECT_TYPE_SHADE_LABELS: Record<ObjectTypeShade, string> = {
  light: SHADES.light.label,
  base: SHADES.base.label,
  deep: SHADES.deep.label,
}

/**
 * A colour is identified by its hue plus shade. The base shade keeps the bare hue name so
 * that configurations saved before the light/deep shades existed keep working unchanged.
 */
export type ObjectTypeColorKey = ObjectTypeHue | `${ObjectTypeHue}-light` | `${ObjectTypeHue}-deep`

export function objectTypeColorKeyFor(hue: ObjectTypeHue, shade: ObjectTypeShade): ObjectTypeColorKey {
  return shade === 'base' ? hue : `${hue}-${shade}`
}

interface ObjectTypeColor {
  label: string
  group: ObjectTypeColorGroup
  hue: ObjectTypeHue
  shade: ObjectTypeShade
  /**
   * Tailwind classes for the badge and the picker swatch. These are composed at runtime, so
   * they are safelisted via `@source inline(...)` in src/index.css — the JIT scanner cannot
   * see them in the source.
   */
  badge: string
  swatch: string
}

function buildColors(): Record<ObjectTypeColorKey, ObjectTypeColor> {
  const colors = {} as Record<ObjectTypeColorKey, ObjectTypeColor>
  for (const { hue, label, group } of HUES) {
    for (const shade of OBJECT_TYPE_SHADES) {
      const s = SHADES[shade]
      colors[objectTypeColorKeyFor(hue, shade)] = {
        label: shade === 'base' ? label : `${label} ${s.label.toLowerCase()}`,
        group,
        hue,
        shade,
        badge: `border-${hue}-${s.border}/${s.borderAlpha} bg-${hue}-${s.fill}/${s.fillAlpha} text-${hue}-${s.text}`,
        swatch: `bg-${hue}-${s.swatch}`,
      }
    }
  }
  return colors
}

export const OBJECT_TYPE_COLORS = buildColors()

export const OBJECT_TYPE_COLOR_KEYS = Object.keys(OBJECT_TYPE_COLORS) as ObjectTypeColorKey[]

/** The hues split into families, in display order, for the picker's hue-by-shade grid. */
export const OBJECT_TYPE_HUES_BY_GROUP: { group: ObjectTypeColorGroup; hues: HueDefinition[] }[] = (
  ['Warm', 'Green', 'Blue', 'Purple & pink', 'Neutral'] as ObjectTypeColorGroup[]
).map((group) => ({ group, hues: HUES.filter((h) => h.group === group) }))

/** Colour every type label shares when per-type colouring is switched off. */
export const UNIFORM_OBJECT_TYPE_COLOR: ObjectTypeColorKey = 'emerald'

/** Starting point when per-type colouring is switched on: galaxies, clusters, nebulae and stars each get a family colour. */
export const DEFAULT_OBJECT_TYPE_COLORS: Record<string, ObjectTypeColorKey> = {
  G: 'violet',
  GPair: 'violet',
  GTrpl: 'violet',
  GGroup: 'violet',
  OCl: 'amber',
  GCl: 'amber',
  '*Ass': 'amber',
  'Cl+N': 'amber',
  PN: 'sky',
  HII: 'sky',
  EmN: 'sky',
  RfN: 'sky',
  Neb: 'sky',
  DrkN: 'indigo',
  SNR: 'rose',
  '*': 'slate',
  '**': 'slate',
  Nova: 'fuchsia',
  Other: 'slate',
}

/** Types offered in the configuration panel, in the same order as the Propositions filter. */
export const CONFIGURABLE_OBJECT_TYPES = FILTERABLE_OBJECT_TYPES

/** The colour key in force for a type, honouring the user's choice then the family default. */
export function objectTypeColorKey(
  type: string | undefined,
  perTypeColorsEnabled: boolean,
  colorsByType: Record<string, ObjectTypeColorKey>,
): ObjectTypeColorKey {
  if (!perTypeColorsEnabled || !type) return UNIFORM_OBJECT_TYPE_COLOR
  const key = colorsByType[type] ?? DEFAULT_OBJECT_TYPE_COLORS[type] ?? UNIFORM_OBJECT_TYPE_COLOR
  return key in OBJECT_TYPE_COLORS ? key : UNIFORM_OBJECT_TYPE_COLOR
}

/**
 * The badge classes for an object type's label. With per-type colouring off every type
 * shares one colour; with it on the user's choice wins, falling back to the family default.
 * Used by both the object cards and the detail modal so a type looks the same everywhere.
 */
export function objectTypeBadgeClasses(
  type: string | undefined,
  perTypeColorsEnabled: boolean,
  colorsByType: Record<string, ObjectTypeColorKey>,
): string {
  return OBJECT_TYPE_COLORS[objectTypeColorKey(type, perTypeColorsEnabled, colorsByType)].badge
}
