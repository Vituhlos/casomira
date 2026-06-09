import { app, net } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { broadcast } from './windows'
import { shell } from 'electron'
import { ipcMain } from 'electron'

const REPO = 'Vituhlos/casomira'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const STATE_FILE = join(app.getPath('userData'), 'update-check.json')

interface UpdateState {
  lastCheck: number
  dismissedVersion: string | null
}

function readState(): UpdateState {
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as UpdateState
  } catch {
    return { lastCheck: 0, dismissedVersion: null }
  }
}

function saveState(state: UpdateState): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state))
  } catch { /* ignore */ }
}

// Porovná dvě verze (s nebo bez "v" prefixu). Vrátí > 0 pokud a > b.
function compareVersions(a: string, b: string): number {
  const parse = (v: string): number[] =>
    v.replace(/^v/, '').split(/[.\-]/).map((s) => parseInt(s, 10) || 0)
  const pa = parse(a)
  const pb = parse(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

async function checkForUpdate(): Promise<void> {
  const state = readState()
  if (Date.now() - state.lastCheck < CHECK_INTERVAL_MS) return

  try {
    const resp = await net.fetch(
      `https://api.github.com/repos/${REPO}/releases?per_page=1`,
      { headers: { 'User-Agent': 'Casomira-desktop' } }
    )
    if (!resp.ok) return

    const releases = (await resp.json()) as Array<{ tag_name: string; html_url: string }>
    if (!Array.isArray(releases) || releases.length === 0) return

    const latest = releases[0]
    const latestTag = latest.tag_name ?? ''
    const current = `v${app.getVersion()}`

    saveState({ lastCheck: Date.now(), dismissedVersion: state.dismissedVersion })

    if (
      latestTag &&
      compareVersions(latestTag, current) > 0 &&
      latestTag !== state.dismissedVersion
    ) {
      broadcast('app:updateAvailable', { version: latestTag, url: latest.html_url })
    }
  } catch {
    // Offline nebo API chyba — bez oznámení.
  }
}

export function scheduleUpdateCheck(): void {
  // Počkáme 10 s po startu — nekomplikujeme první vykreslení okna.
  setTimeout(() => { checkForUpdate().catch(() => {}) }, 10_000)
}

export function registerUpdaterIpc(): void {
  ipcMain.handle('updater:dismiss', (_e, version: string) => {
    const state = readState()
    saveState({ ...state, dismissedVersion: version })
  })
  ipcMain.handle('updater:openUrl', (_e, url: string) => {
    // Otevřeme GitHub Release stránku v systémovém prohlížeči.
    shell.openExternal(url).catch(() => {})
  })
}
