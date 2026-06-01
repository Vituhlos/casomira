import { BrowserWindow, dialog } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import * as repo from '../repo'
import { buildDatabaseBackup, buildZavodBackup, serializeBackup } from './export'
import { navrhZalohySouboru, navrhZalohyVse } from './filename'
import {
  BackupValidationError,
  previewRestoreFromText,
  restoreAllZavodyFromText,
  restoreFromText
} from './import'
import type {
  BackupExportResult,
  BackupRestoreArg,
  BackupRestorePreview,
  BackupRestoreResult
} from './types'

const JSON_FILTER = [{ name: 'Záloha Časomíry (.json)', extensions: ['json'] }]

export async function exportZavodDialog(
  parentWin: BrowserWindow | null,
  zavodId: number
): Promise<BackupExportResult> {
  const zavod = repo.getZavodById(zavodId)
  if (!zavod) return { ok: false, chyba: 'Závod nenalezen.' }

  const dlg = {
    title: 'Zálohovat závod',
    defaultPath: navrhZalohySouboru(zavod.nazev, zavod.datum),
    filters: JSON_FILTER
  }
  const res = parentWin
    ? await dialog.showSaveDialog(parentWin, dlg)
    : await dialog.showSaveDialog(dlg)
  if (res.canceled || !res.filePath) return { ok: false, zruseno: true }

  try {
    const data = buildZavodBackup(zavodId)
    await writeFile(res.filePath, serializeBackup(data), 'utf8')
    return { ok: true, cesta: res.filePath }
  } catch (e) {
    const chyba = e instanceof Error ? e.message : 'Export zálohy se nezdařil.'
    return { ok: false, chyba }
  }
}

export async function exportAllDialog(
  parentWin: BrowserWindow | null
): Promise<BackupExportResult> {
  const dlg = {
    title: 'Zálohovat všechny závody',
    defaultPath: navrhZalohyVse(new Date().toISOString()),
    filters: JSON_FILTER
  }
  const res = parentWin
    ? await dialog.showSaveDialog(parentWin, dlg)
    : await dialog.showSaveDialog(dlg)
  if (res.canceled || !res.filePath) return { ok: false, zruseno: true }

  try {
    const data = buildDatabaseBackup()
    if (data.zavody.length === 0) {
      return { ok: false, chyba: 'V databázi není žádný závod k zálohování.' }
    }
    await writeFile(res.filePath, serializeBackup(data), 'utf8')
    return { ok: true, cesta: res.filePath }
  } catch (e) {
    const chyba = e instanceof Error ? e.message : 'Export zálohy se nezdařil.'
    return { ok: false, chyba }
  }
}

export async function previewRestoreDialog(
  parentWin: BrowserWindow | null
): Promise<BackupRestorePreview | null> {
  const dlg = {
    title: 'Obnovit ze zálohy',
    filters: JSON_FILTER,
    properties: ['openFile' as const]
  }
  const res = parentWin
    ? await dialog.showOpenDialog(parentWin, dlg)
    : await dialog.showOpenDialog(dlg)
  if (res.canceled || res.filePaths.length === 0) return null

  const cesta = res.filePaths[0]
  try {
    const text = await readFile(cesta, 'utf8')
    return previewRestoreFromText(text, cesta)
  } catch (e) {
    if (e instanceof BackupValidationError) throw e
    throw new BackupValidationError(
      e instanceof Error ? e.message : 'Soubor zálohy se nepodařilo načíst.'
    )
  }
}

export async function restoreBackup(arg: BackupRestoreArg): Promise<BackupRestoreResult> {
  try {
    const text = await readFile(arg.soubor, 'utf8')
    const preview = previewRestoreFromText(text, arg.soubor)
    const multi = preview.pocetZavodu > 1 && preview.scope === 'database'

    if (multi && arg.mode === 'overwrite') {
      return {
        ok: false,
        chyba: 'Záloha celé databáze nelze přepsat jedním závodem. Obnovte jako nové závody.'
      }
    }

    if (multi) {
      const ids = restoreAllZavodyFromText(text)
      const z = repo.getZavodById(ids[ids.length - 1])
      return {
        ok: true,
        zavodId: ids[ids.length - 1],
        nazev: z ? `${z.nazev} (+${ids.length - 1} dalších)` : `${ids.length} závodů`
      }
    }

    const { zavodId, nazev } = restoreFromText(
      text,
      arg.mode,
      arg.targetZavodId,
      arg.zavodIndex ?? 0
    )
    return { ok: true, zavodId, nazev }
  } catch (e) {
    if (e instanceof BackupValidationError) {
      return { ok: false, chyba: e.message }
    }
    const chyba = e instanceof Error ? e.message : 'Obnova ze zálohy se nezdařila.'
    return { ok: false, chyba }
  }
}
