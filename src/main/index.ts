import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { getDb } from './db/connection'
import { migrate } from './db/migrate'
import { seed } from './db/seed'

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
  // Databázi otevřeme, vytvoříme schéma (migrace) a při prvním běhu naplníme daty.
  const db = getDb()
  migrate(db)
  seed(db)

  registerIpc()
  createWindow()

  app.on('activate', () => {
    // macOS: kliknutí na ikonu v docku znovu otevře okno.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Na macOS aplikace běží dál i bez oken (tamní konvence).
  if (process.platform !== 'darwin') app.quit()
})
