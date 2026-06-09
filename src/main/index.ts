import { app, shell, BrowserWindow, dialog, Menu } from 'electron'
import { join } from 'node:path'
import { release } from 'node:os'

// Windows 11 = build ≥ 22000 (první verze s Mica materialem).
// os.release() vrátí např. "10.0.22621" i pro Windows 11.
function detectWin11(): boolean {
  if (process.platform !== 'win32') return false
  const parts = release().split('.').map(Number)
  return (parts[2] ?? 0) >= 22000
}
const isWin11 = detectWin11()

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
import { scheduleUpdateCheck, registerUpdaterIpc } from './updater'
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

// Na macOS je systémový menu bar vždy viditelný. Bez vlastního menu Electron
// zobrazí výchozí menu s Reload/DevTools — nevhodné v produkci. Edit role musí
// být zachovány, aby fungovala undo/cut/copy/paste v textových polích (⌘Z/X/C/V).
function setupMacMenu(): void {
  const menu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { role: 'about', label: `O Časomíře` },
        { type: 'separator' },
        { role: 'services', label: 'Služby' },
        { type: 'separator' },
        { role: 'hide', label: 'Skrýt Časomíru' },
        { role: 'hideOthers', label: 'Skrýt ostatní' },
        { role: 'unhide', label: 'Zobrazit vše' },
        { type: 'separator' },
        { role: 'quit', label: 'Ukončit Časomíru' }
      ]
    },
    {
      label: 'Upravit',
      submenu: [
        { role: 'undo', label: 'Zpět' },
        { role: 'redo', label: 'Znovu' },
        { type: 'separator' },
        { role: 'cut', label: 'Vyjmout' },
        { role: 'copy', label: 'Kopírovat' },
        { role: 'paste', label: 'Vložit' },
        { role: 'selectAll', label: 'Vybrat vše' }
      ]
    },
    {
      label: 'Okno',
      submenu: [
        { role: 'minimize', label: 'Minimalizovat' },
        { role: 'zoom', label: 'Přiblížit' },
        { type: 'separator' },
        { role: 'front', label: 'Přenést vše dopředu' },
        { type: 'separator' },
        { role: 'close', label: 'Zavřít' }
      ]
    }
  ])
  Menu.setApplicationMenu(menu)
}

function createWindow(): void {
  const isMac = process.platform === 'darwin'
  // Průhledné pozadí potřebujeme všude, kde aplikujeme nativní material.
  const useNativeVibrancy = isMac || isWin11

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    // Průhledné pozadí = nativní material prosvítá přes rgba() sidebar/toolbar.
    // Na Windows 10 / Linuxu zůstáváme solidní — Mica není k dispozici.
    backgroundColor: useNativeVibrancy ? '#00000000' : '#f4f4f6',
    // macOS: sidebar vibrancy material (bluruje plochu/jiné appky za oknem).
    vibrancy: isMac ? 'sidebar' : undefined,
    title: 'Časomíra',
    icon: appIconPath(),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Windows 11: Mica material (blurovaná + tónovaná tapeta plochy).
  // Nastavíme až po vytvoření okna — constructor option pro Windows neexistuje.
  if (isWin11) {
    mainWindow.setBackgroundMaterial('mica')
  }

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

    if (process.platform === 'darwin') setupMacMenu()
    registerIpc()
    registerUpdaterIpc()
    registerAppQuitGuard()
    createWindow()
    scheduleUpdateCheck()
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
