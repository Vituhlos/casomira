import { SCHEMA_VERSION } from '../db/migrate'
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  LEGACY_BACKUP_FORMAT,
  type BackupZavodPayload,
  type VerdictBackupFile
} from './types'

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupValidationError'
  }
}

function jeObjekt(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function jePole(v: unknown): v is unknown[] {
  return Array.isArray(v)
}

function vyzadujZavodPayload(raw: unknown, index: number): BackupZavodPayload {
  if (!jeObjekt(raw)) throw new BackupValidationError(`Závod #${index + 1}: chybí data.`)
  const zavod = raw.zavod
  if (!jeObjekt(zavod) || typeof zavod.nazev !== 'string' || typeof zavod.datum !== 'string') {
    throw new BackupValidationError(`Závod #${index + 1}: neplatný záznam závodu.`)
  }
  const tabulky = [
    'kategorie',
    'skupiny',
    'jezdci',
    'kola',
    'jizdy',
    'rost_pozice',
    'vysledky',
    'mereni',
    'uprava_log'
  ] as const
  for (const t of tabulky) {
    if (!jePole(raw[t])) {
      throw new BackupValidationError(`Závod #${index + 1}: chybí pole „${t}".`)
    }
  }
  return raw as unknown as BackupZavodPayload
}

/** Načte JSON text a ověří strukturu. Při chybě hodí BackupValidationError. */
export function parseBackupJson(text: string): VerdictBackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupValidationError('Soubor není platný JSON.')
  }
  if (!jeObjekt(parsed)) {
    throw new BackupValidationError('Záloha musí být JSON objekt.')
  }
  if (parsed.format !== BACKUP_FORMAT && parsed.format !== LEGACY_BACKUP_FORMAT) {
    throw new BackupValidationError(
      'Neznámý formát souboru. Očekávána záloha Verdictu (verdict-backup) nebo starší Časomíry (casomira-backup).'
    )
  }
  const fv = parsed.formatVersion
  if (typeof fv !== 'number' || fv < 1 || fv > BACKUP_FORMAT_VERSION) {
    throw new BackupValidationError(
      `Nepodporovaná verze zálohy (${String(fv)}). Aktualizujte aplikaci.`
    )
  }
  if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion < 1) {
    throw new BackupValidationError('Záloha neobsahuje platné číslo verze schématu.')
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    throw new BackupValidationError(
      `Záloha pochází z novější verze databáze (schéma ${parsed.schemaVersion}). Aktualizujte aplikaci.`
    )
  }
  if (!jePole(parsed.zavody) || parsed.zavody.length === 0) {
    throw new BackupValidationError('Záloha neobsahuje žádný závod.')
  }
  const scope = parsed.scope
  if (scope !== 'zavod' && scope !== 'database') {
    throw new BackupValidationError('Neplatný rozsah zálohy (scope).')
  }
  const zavody = parsed.zavody.map((z, i) => vyzadujZavodPayload(z, i))
  return {
    ...(parsed as unknown as VerdictBackupFile),
    zavody
  }
}
