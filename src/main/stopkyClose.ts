import { app, BrowserWindow, dialog } from 'electron'
import { getAktivniZavod, mereniMaNezapsane } from './repo'

const DIALOG = {
  type: 'warning' as const,
  title: 'Stopky — nezapsané měření',
  message: 'Máš rozměřené stopky, které nejsou zapsané do výsledků.',
  detail:
    'Data měření zůstanou uložená v aplikaci. Po znovuotevření stopek je najdeš tam, kde jsi skončil. ' +
    'Nezapomeň je zapsat do výsledků v hlavní aplikaci.',
  buttons: ['Zůstat', 'Zavřít i tak'],
  defaultId: 0,
  cancelId: 0,
  noLink: true
}

let stopkyForceClose = false
let appForceQuit = false

function potvrdZavreni(parent: BrowserWindow | null): boolean {
  const z = getAktivniZavod()
  if (!z || !mereniMaNezapsane(z.id)) return true
  const res = parent
    ? dialog.showMessageBoxSync(parent, DIALOG)
    : dialog.showMessageBoxSync(DIALOG)
  return res === 1
}

/** Guard pro zavření okna stopek. */
export function attachStopkyCloseGuard(win: BrowserWindow): void {
  win.on('close', (e) => {
    if (stopkyForceClose) {
      stopkyForceClose = false
      return
    }
    if (!potvrdZavreni(win)) {
      e.preventDefault()
      return
    }
    stopkyForceClose = false
  })
}

export function requestStopkyClose(): void {
  stopkyForceClose = true
}

/** Guard pro ukončení celé aplikace (Ctrl+Q, zavření hlavního okna…). */
export function registerAppQuitGuard(): void {
  app.on('before-quit', (e) => {
    if (appForceQuit) return
    const focused = BrowserWindow.getFocusedWindow()
    const parent = focused && !focused.isDestroyed() ? focused : BrowserWindow.getAllWindows()[0]
    if (!potvrdZavreni(parent ?? null)) {
      e.preventDefault()
      return
    }
    appForceQuit = true
  })
}
