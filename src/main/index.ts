import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'node:path'

// Cesta k ikoně appky za běhu (Windows/Linux).
// macOS ikonu řeší .app bundle (electron-builder) — na darwinu vracíme undefined.
// prod: extraResources zkopíruje icon.png do process.resourcesPath
// dev:  ikona leží v build/ relativně k out/main/
function appIconPath(): string | undefined {
  if (process.platform === 'darwin') return undefined
  return app.isPackaged
    ? join(process.resourcesPath, 'icon.png')
    : join(__dirname, '../../build/icon.png')
}
import { appendFileSync, mkdirSync } from 'node:fs'
import { registerIpc } from './ipc'
import { getDb } from './db/connection'
import { migrate } from './db/migrate'
import { seed } from './db/seed'
import { registerAppQuitGuard } from './stopkyClose'

// Zapíše krok startu do souboru startup.log v datové složce aplikace. Když start
// spadne (typicky nativní modul better-sqlite3 na macOS), z logu je přesně vidět,
// u kterého kroku to skončilo — i bez konzole. Logování samo nesmí start shodit.
function logStartup(msg: string): void {
  try {
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, 'startup.log'), `[${new Date().toISOString()}] ${msg}\n`)
  } catch {
    /* prázdné — diagnostika nikdy nesmí být příčinou pádu */
  }
}

// Nezachycená výjimka při startu = jinak tichý pád bez hlášky. Ukážeme ji.
process.on('uncaughtException', (err) => {
  const e = err as Error
  logStartup(`uncaughtException: ${e?.stack ?? e?.message ?? String(err)}`)
  try {
    dialog.showErrorBox(
      'Časomíra — neočekávaná chyba',
      `${e?.message ?? err}\n\nPodrobnosti: ${join(app.getPath('userData'), 'startup.log')}`
    )
  } catch {
    /* dialog nemusí být k dispozici (např. před app ready) */
  }
})

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f4f4f6', // sníží bílé bliknutí při startu
    title: 'Časomíra',
    icon: appIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Okno ukážeme až je obsah připravený — žádné bliknutí prázdného okna.
  mainWindow.on('ready-to-show', () => mainWindow.show())

  // Odkazy s target=_blank otevřít v systémovém prohlížeči, ne v appce.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // V dev režimu electron-vite naservíruje okno přes lokální dev server,
  // v produkci načteme zbuildovaný HTML soubor.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  try {
    logStartup(
      `start: platform=${process.platform} arch=${process.arch} ` +
        `electron=${process.versions.electron} node=${process.versions.node}`
    )

    // Databázi otevřeme, vytvoříme schéma (migrace) a při prvním běhu naplníme daty.
    // Breadcrumbs okolo otevření DB: kdyby nativní modul spadl, log skončí přesně tady.
    logStartup('otevírám databázi (better-sqlite3)…')
    const db = getDb()
    logStartup('databáze otevřena → migrace schématu')
    migrate(db)
    logStartup('migrace hotová → seed')
    seed(db)
    logStartup('seed hotový → IPC + okno')

    registerIpc()
    registerAppQuitGuard()
    createWindow()
    logStartup('start dokončen, okno vytvořeno')

    app.on('activate', () => {
      // macOS: kliknutí na ikonu v docku znovu otevře okno.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (err) {
    // JS-úrovňová chyba (např. nativní modul zkompilovaný pro jinou ABI, chybějící
    // soubor DB). Ukážeme ji uživateli místo tichého zavření.
    const e = err as Error
    logStartup(`CHYBA při startu: ${e?.stack ?? e?.message ?? String(err)}`)
    dialog.showErrorBox(
      'Časomíra — chyba při spuštění',
      `Aplikaci se nepodařilo spustit.\n\n${e?.message ?? err}\n\n` +
        `Log: ${join(app.getPath('userData'), 'startup.log')}`
    )
    app.quit()
  }
})

app.on('window-all-closed', () => {
  // Na macOS aplikace běží dál i bez oken (tamní konvence).
  if (process.platform !== 'darwin') app.quit()
})
