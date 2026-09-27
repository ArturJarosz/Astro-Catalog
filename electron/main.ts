import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb, getLastRoot, saveCatalogue, loadCatalogue, updateCatalogueDirectories } from './db'
import { scanRoot, scanDirectories } from './scanner'
import { buildCopyPlan, executeCopy, listSourceDirectories, SEESTAR_SOURCE_DIR } from './seestar'
import { buildMergePlan, executeMerge } from './merge'
import { buildRenamePlan, executeRename } from './rename'
import type { CurrentLocationResult, MergeMoveItem, ObjectSummary, SeestarCopyItem } from './shared-types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0b0f14',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

ipcMain.handle('select-root-dir', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('analyze-directory', async (_event, rootPath: string, directoryPattern: string) => {
  const { objects, warnings } = scanRoot(rootPath, directoryPattern, (currentPath, objectsScanned) => {
    mainWindow?.webContents.send('scan-progress', { currentPath, objectsScanned })
  })
  saveCatalogue(rootPath, objects, warnings)
  return loadCatalogue()
})

ipcMain.handle(
  'analyze-directories',
  async (_event, rootPath: string, directoryPattern: string, topLevelNames: string[]) => {
    const { objects, warnings } = scanDirectories(rootPath, directoryPattern, topLevelNames, (currentPath, objectsScanned) => {
      mainWindow?.webContents.send('scan-progress', { currentPath, objectsScanned })
    })
    const directories = topLevelNames.map((name) => path.join(rootPath, name))
    updateCatalogueDirectories(rootPath, directories, objects, warnings)
    return loadCatalogue()
  },
)

ipcMain.handle('get-catalogue', async () => {
  const catalogue = loadCatalogue()
  if (catalogue.rootPath) return catalogue
  const lastRoot = getLastRoot()
  return { ...catalogue, rootPath: lastRoot }
})

const SEESTAR_CHECK_TIMEOUT_MS = 5000

ipcMain.handle('check-seestar-connection', async (_event, sourceDirectory: string = SEESTAR_SOURCE_DIR) => {
  const accessible = fs
    .access(sourceDirectory)
    .then(() => true)
    .catch(() => false)
  const timedOut = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), SEESTAR_CHECK_TIMEOUT_MS))
  return Promise.race([accessible, timedOut])
})

ipcMain.handle('list-seestar-directories', async (_event, sourceDirectory: string = SEESTAR_SOURCE_DIR) => {
  return listSourceDirectories(sourceDirectory)
})

ipcMain.handle('select-seestar-target-dir', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('select-object-images-dir', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

const LOCAL_OBJECT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png']

ipcMain.handle('get-local-object-image', async (_event, imagesPath: string, objectName: string) => {
  if (!imagesPath) return null
  let entries: string[]
  try {
    entries = await fs.readdir(imagesPath)
  } catch {
    return null
  }
  const match = entries.find((entry) => {
    const ext = path.extname(entry).toLowerCase()
    if (!LOCAL_OBJECT_IMAGE_EXTENSIONS.includes(ext)) return false
    return path.basename(entry, path.extname(entry)).toLowerCase() === objectName.toLowerCase()
  })
  if (!match) return null
  return `file://${path.join(imagesPath, match)}`
})

ipcMain.handle(
  'build-seestar-copy-plan',
  async (
    _event,
    subDirNames: string[],
    targetDirectory: string,
    directoryPattern: string,
    sourceDirectory: string = SEESTAR_SOURCE_DIR,
    extensions?: string[],
  ) => {
    return buildCopyPlan(subDirNames, targetDirectory, directoryPattern, sourceDirectory, extensions)
  },
)

ipcMain.handle(
  'execute-seestar-copy',
  async (_event, items: SeestarCopyItem[], overwrite: boolean, targetDirectory: string) => {
    return executeCopy(items, overwrite, targetDirectory, (progress) => {
      mainWindow?.webContents.send('seestar-copy-progress', progress)
    })
  },
)

ipcMain.handle(
  'build-merge-plan',
  async (
    _event,
    rootPath: string,
    mainObjectPath: string,
    otherObjectPaths: string[],
    directoryPattern: string,
  ) => {
    return buildMergePlan(rootPath, mainObjectPath, otherObjectPaths, directoryPattern)
  },
)

ipcMain.handle(
  'execute-merge',
  async (_event, items: MergeMoveItem[], sourceObjectPaths: string[]) => {
    return executeMerge(items, sourceObjectPaths, (progress) => {
      mainWindow?.webContents.send('merge-progress', progress)
    })
  },
)

ipcMain.handle(
  'build-rename-plan',
  async (
    _event,
    rootPath: string,
    objectPath: string,
    isMosaic: boolean,
    newName: string,
    directoryPattern: string,
  ) => {
    return buildRenamePlan(rootPath, objectPath, isMosaic, newName, directoryPattern)
  },
)

ipcMain.handle(
  'execute-rename',
  async (_event, items: MergeMoveItem[], sourceObjectPaths: string[]) => {
    return executeRename(items, sourceObjectPaths, (progress) => {
      mainWindow?.webContents.send('rename-progress', progress)
    })
  },
)

interface WikiSummary {
  title: string
  description?: string
  extract?: string
  thumbnail?: { source: string }
  originalimage?: { source: string }
  content_urls?: { desktop?: { page?: string } }
}

const WIKI_USER_AGENT = 'AstroCatalogue/1.0 (local desktop app)'
const wikiSummaryCache = new Map<string, ObjectSummary | null>()

async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
      headers: { 'User-Agent': WIKI_USER_AGENT },
    })
    if (!res.ok) return null
    return (await res.json()) as WikiSummary
  } catch {
    return null
  }
}

async function searchWikiTitle(query: string): Promise<string | null> {
  try {
    const url = new URL('https://en.wikipedia.org/w/api.php')
    url.searchParams.set('action', 'opensearch')
    url.searchParams.set('search', query)
    url.searchParams.set('limit', '1')
    url.searchParams.set('namespace', '0')
    url.searchParams.set('format', 'json')
    const res = await fetch(url, { headers: { 'User-Agent': WIKI_USER_AGENT } })
    if (!res.ok) return null
    const data = (await res.json()) as [string, string[], string[], string[]]
    return data[1]?.[0] ?? null
  } catch {
    return null
  }
}

function candidateWikiTitle(name: string, catalog: string, catalogNumber: number | null): string {
  if (catalogNumber === null) return name
  switch (catalog) {
    case 'Messier':
      return `Messier ${catalogNumber}`
    case 'Caldwell':
      return `Caldwell ${catalogNumber}`
    case 'NGC':
      return `NGC ${catalogNumber}`
    case 'IC':
      return `IC ${catalogNumber}`
    case 'Abell':
      return `Abell ${catalogNumber}`
    default:
      return name
  }
}

ipcMain.handle(
  'get-object-summary',
  async (
    _event,
    name: string,
    catalog: string,
    catalogNumber: number | null,
  ): Promise<ObjectSummary | null> => {
    const primaryTitle = candidateWikiTitle(name, catalog, catalogNumber)
    const cached = wikiSummaryCache.get(primaryTitle)
    if (cached !== undefined) return cached

    let summary = await fetchWikiSummary(primaryTitle)
    if (!summary) {
      const searched = await searchWikiTitle(primaryTitle)
      if (searched) summary = await fetchWikiSummary(searched)
    }

    const result: ObjectSummary | null = summary
      ? {
          title: summary.title,
          description: summary.description ?? null,
          extract: summary.extract ?? null,
          thumbnailUrl: summary.thumbnail?.source ?? summary.originalimage?.source ?? null,
          pageUrl: summary.content_urls?.desktop?.page ?? null,
        }
      : null

    wikiSummaryCache.set(primaryTitle, result)
    return result
  },
)

/**
 * Electron's prebuilt binaries ship without a Google API key, so Chromium's
 * navigator.geolocation always fails in the renderer. We resolve the location
 * from the main process via IP lookup instead.
 */
const IP_LOCATION_PROVIDERS = [
  {
    url: 'http://ip-api.com/json/',
    parse: (data: Record<string, unknown>) => ({
      latitude: data.lat,
      longitude: data.lon,
      label: [data.city, data.country].filter(Boolean).join(', ') || null,
    }),
  },
  // Fallback only: ipapi.co aggressively rate-limits anonymous requests (HTTP 429).
  {
    url: 'https://ipapi.co/json/',
    parse: (data: Record<string, unknown>) => ({
      latitude: data.latitude,
      longitude: data.longitude,
      label: [data.city, data.country_name].filter(Boolean).join(', ') || null,
    }),
  },
]

ipcMain.handle('get-current-location', async (): Promise<CurrentLocationResult> => {
  let lastError = 'Could not determine your location.'
  for (const provider of IP_LOCATION_PROVIDERS) {
    try {
      const res = await fetch(provider.url, { headers: { 'User-Agent': WIKI_USER_AGENT } })
      if (!res.ok) {
        lastError = `Location lookup failed (HTTP ${res.status}).`
        continue
      }
      const parsed = provider.parse((await res.json()) as Record<string, unknown>)
      const latitude = Number(parsed.latitude)
      const longitude = Number(parsed.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        lastError = 'Location lookup returned no coordinates.'
        continue
      }
      return {
        ok: true,
        latitude: Number(latitude.toFixed(4)),
        longitude: Number(longitude.toFixed(4)),
        label: (parsed.label as string | null) ?? null,
      }
    } catch {
      lastError = 'Location lookup failed. Check your internet connection.'
    }
  }
  return { ok: false, error: lastError }
})

ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url)
})

app.whenReady().then(() => {
  initDb()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
