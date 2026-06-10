/**
 * Screenshot mode — IPC handlery pro automatický tour.
 * Registruje se jen když SCREENSHOT_MODE=1; v produkci se nepoužívá.
 */
import { app, ipcMain, BrowserWindow } from 'electron'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

// Složka pro screenshoty vedle projektu (process.cwd() = root projektu v dev režimu).
const SCREENSHOTS_DIR = join(process.cwd(), 'screenshots')

export function registerScreenshotIpc(): void {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true })

  // screenshot:capture — zachytí okno, uloží PNG
  ipcMain.handle('screenshot:capture', async (event, name: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    try {
      const image = await win.webContents.capturePage()
      const pngBuffer = image.toPNG()
      const filePath = join(SCREENSHOTS_DIR, `${name}.png`)
      writeFileSync(filePath, pngBuffer)
      console.log(`[screenshot] saved: ${name}.png`)
    } catch (err) {
      console.error(`[screenshot] capture failed for ${name}:`, err)
    }
  })

  // screenshot:captureWindow — zachytí jiné okno podle části titulku
  ipcMain.handle('screenshot:captureWindow', async (_event, name: string, titlePart: string) => {
    const win = BrowserWindow.getAllWindows().find((w) =>
      !w.isDestroyed() && w.getTitle().includes(titlePart)
    )
    if (!win) {
      console.warn(`[screenshot] window "${titlePart}" not found, skipping ${name}.png`)
      return
    }
    try {
      const image = await win.webContents.capturePage()
      const pngBuffer = image.toPNG()
      const filePath = join(SCREENSHOTS_DIR, `${name}.png`)
      writeFileSync(filePath, pngBuffer)
      console.log(`[screenshot] saved: ${name}.png`)
    } catch (err) {
      console.error(`[screenshot] capture failed for ${name}:`, err)
    }
  })

  // screenshot:done — tour skončil, appka se ukončí
  ipcMain.handle('screenshot:done', () => {
    console.log(`[screenshot] tour complete — screenshots in: ${SCREENSHOTS_DIR}`)
    setTimeout(() => app.quit(), 500)
  })
}
