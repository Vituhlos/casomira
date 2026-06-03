import { app, BrowserWindow, ipcMain } from 'electron'
import { getAktivniZavod, mereniMaNezapsane } from './repo'

// Jaký typ akce čeká na potvrzení uživatele z rendereru.
// 'window' = zavření okna stopek; 'quit' = ukončení celé appky.
let confirmPending: 'window' | 'quit' | null = null

let stopkyForceClose = false
let appForceQuit = false

function maNezapsane(): boolean {
  const z = getAktivniZavod()
  return z != null && mereniMaNezapsane(z.id)
}

function sendConfirmRequest(target: BrowserWindow, action: 'window' | 'quit'): void {
  confirmPending = action
  target.webContents.send('stopky:requestConfirm')
}

/** Guard pro zavření okna stopek. */
export function attachStopkyCloseGuard(win: BrowserWindow): void {
  win.on('close', (e) => {
    if (stopkyForceClose) {
      stopkyForceClose = false
      return
    }
    if (!maNezapsane()) return
    e.preventDefault()
    sendConfirmRequest(win, 'window')
  })
}

export function requestStopkyClose(): void {
  stopkyForceClose = true
}

/** Guard pro ukončení celé appky + IPC handler pro odpověď z rendereru. */
export function registerAppQuitGuard(): void {
  // Renderer potvrdil zavření: proveď odpovídající akci dle kontextu.
  ipcMain.handle('stopky:zavritPotvrzeno', (event) => {
    const action = confirmPending
    confirmPending = null
    if (action === 'window') {
      // Použijeme event.sender místo hledání podle titulku — titulek okna se po
      // načtení HTML přepíše, takže getTitle().includes('Stopky') by selhalo.
      const thatWin = BrowserWindow.fromWebContents(event.sender)
      if (!thatWin || thatWin.isDestroyed()) return
      stopkyForceClose = true  // nastavit těsně před close(), ne dříve
      thatWin.close()
    } else if (action === 'quit') {
      appForceQuit = true
      app.quit()
    }
  })

  app.on('before-quit', (e) => {
    if (appForceQuit) return
    if (!maNezapsane()) return
    e.preventDefault()
    // Preferuj stopky okno; jinak hlavní (nebo libovolné dostupné) okno.
    const all = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed())
    const sw = all.find((w) => w.getTitle().includes('Stopky'))
    const target = sw ?? all[0]
    if (!target) {
      // Žádné okno není k dispozici — quit rovnou.
      appForceQuit = true
      app.quit()
      return
    }
    sendConfirmRequest(target, 'quit')
  })
}
