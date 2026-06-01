// Správa oken a vysílání událostí mezi nimi. Stopky běží v samostatném okně,
// které sdílí stejnou databázi přes hlavní proces. Po změně dat (např. zápis
// měření do výsledků) pošleme všem oknům `app:dataChanged`, ať se obnoví.

import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'

let stopkyWin: BrowserWindow | null = null

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
    title: 'Stopky — Časomíra',
    backgroundColor: '#f4f4f6',
    autoHideMenuBar: true,
    webPreferences: webPreferences()
  })
  stopkyWin.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Stejný renderer jako hlavní okno, jen s markerem `#stopky` v adrese.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void stopkyWin.loadURL(`${devUrl}#stopky`)
  else void stopkyWin.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'stopky' })

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
