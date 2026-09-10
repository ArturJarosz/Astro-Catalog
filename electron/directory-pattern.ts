export type PatternToken = 'object' | 'type' | 'date' | 'exposure'

export interface DirectoryPatternSegment {
  tokens: PatternToken[]
  regex: RegExp
}

export interface DirectoryPatternValues {
  object: string
  type: string
  date: string
  exposure: string
}

const TOKEN_NAMES: PatternToken[] = ['object', 'type', 'date', 'exposure']

const TOKEN_SUBPATTERNS: Record<PatternToken, string> = {
  object: '.+',
  type: '\\S+',
  date: '\\d{4}\\.\\d{2}\\.\\d{2}',
  exposure: '\\d+(?:\\.\\d+)?s',
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function splitDirectoryPatternSegments(pattern: string): string[] {
  return pattern
    .split(/[/\\]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
}

export function parseDirectoryPattern(pattern: string): DirectoryPatternSegment[] {
  const tokenRegex = new RegExp(`\\{(${TOKEN_NAMES.join('|')})\\}`, 'g')

  return splitDirectoryPatternSegments(pattern).map((raw) => {
    const tokens: PatternToken[] = []
    let regexSource = '^'
    let lastIndex = 0
    let match: RegExpExecArray | null

    tokenRegex.lastIndex = 0
    while ((match = tokenRegex.exec(raw))) {
      regexSource += escapeRegExp(raw.slice(lastIndex, match.index))
      const token = match[1] as PatternToken
      tokens.push(token)
      regexSource += `(?<${token}>${TOKEN_SUBPATTERNS[token]})`
      lastIndex = tokenRegex.lastIndex
    }
    regexSource += escapeRegExp(raw.slice(lastIndex)) + '$'

    return { tokens, regex: new RegExp(regexSource) }
  })
}

export function directoryPatternTokens(pattern: string): Set<PatternToken> {
  return new Set(parseDirectoryPattern(pattern).flatMap((segment) => segment.tokens))
}

export function applyDirectoryPattern(pattern: string, values: DirectoryPatternValues): string[] {
  const filled = pattern
    .replaceAll('{object}', values.object)
    .replaceAll('{type}', values.type)
    .replaceAll('{date}', values.date)
    .replaceAll('{exposure}', values.exposure)

  return splitDirectoryPatternSegments(filled)
}
