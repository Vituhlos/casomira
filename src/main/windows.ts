// Správa oken a vysílání událostí mezi nimi. Stopky běží v samostatném okně,
// které sdílí stejnou databázi přes hlavní proces. Po změně dat (např. zápis
// měření do výsledků) pošleme všem oknům `app:dataChanged`, ať se obnoví.

import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { attachStopkyCloseGuard } from './stopkyClose'

function appIconPath(): string | undefined {
  if (process.platform === 'darwin') return undefined
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
}

let stopkyWin: BrowserWindow | null = null

// V dev režimu naváže F12 (toggle DevTools) a Ctrl/Cmd+R (reload) na okno.
// Produkce (`app.isPackaged`) se nedotkne — appka zůstane bez DevTools zkratek.
export function devToolsZkratky(win: BrowserWindow): void {
  if (app.isPackaged) return
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown') return
    if (input.key === 'F12') win.webContents.toggleDevTools()
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r') win.webContents.reload()
  })
}

function webPreferences(): Electron.WebPreferences {
  return {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: false,
    contextIsolation: true,
    nodeIntegration: false
  }
}

// Otevře okno stopek; když už běží, jen ho vytáhne dopředu (neotevírá víckrát).
export function openStopky(): void {
  if (stopkyWin && !stopkyWin.isDestroyed()) {
    if (stopkyWin.isMinimized()) stopkyWin.restore()
    stopkyWin.focus()
    return
  }
  // Velikost je dimenzována na tři sloupce vedle sebe (ovládání 340 +
  // tabulka časů 600 + náhled roštu 300 = 1240) a na výšku, do které se
  // pohodlně vejde tabulka s plnými 8 řádky + hlavička + spodní tlačítka
  // (viz výpočet v StopkyApp.tsx). Pod tyto rozměry už by se obsah ořezával.
  stopkyWin = new BrowserWindow({
    width: 1280,
    height: 760,
    minWidth: 1240,
    minHeight: 660,
    // Okno ukážeme až je obsah připravený (ready-to-show) — jinak bliká prázdné
    // průhledné okno, než se renderer vykreslí.
    show: false,
    title: 'Stopky — Verdict',
    // Průhledné pozadí + Windows 11 „Mica" materiál — jemné protónování plochy,
    // floating panely plavou nad pozadím (Microsoft doporučuje Micu pro pozadí
    // dlouho otevřených oken). Mica vyžaduje průhledný backgroundColor.
    // Na ne-Win11 se materiál neprojeví.
    backgroundColor: '#00000000',
    backgroundMaterial: 'mica',
    autoHideMenuBar: true,
    icon: appIconPath(),
    webPreferences: webPreferences()
  })
  // Až renderer naběhne a je co vykreslit, okno ukážeme a vytáhneme dopředu.
  stopkyWin.once('ready-to-show', () => {
    stopkyWin?.show()
    stopkyWin?.focus()
  })
  stopkyWin.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Zabránit přepsání titulku z HTML (<title>Verdict</title>) — titulek „Stopky"
  // musí zůstat, aby ho stopkyClose.ts (before-quit) správně identifikoval.
  stopkyWin.on('page-title-updated', (e) => e.preventDefault())

  // Stejný renderer jako hlavní okno, jen s markerem `#stopky` v adrese.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void stopkyWin.loadURL(`${devUrl}#stopky`)
  else void stopkyWin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'stopky' })

  devToolsZkratky(stopkyWin)
  attachStopkyCloseGuard(stopkyWin)

  stopkyWin.on('closed', () => {
    stopkyWin = null
  })
}

// Pošle událost všem otevřeným oknům (hlavní i stopky).
export function broadcast(channel: string, payload?: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload)
  }
}
