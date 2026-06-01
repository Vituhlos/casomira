// Typy zálohy/obnovy — sdílené mezi main, preload a renderer.

export type BackupScope = 'zavod' | 'database'

export interface BackupZavodRow {
  id: number
  nazev: string
  datum: string
  misto: string
  typ: 'RAC' | 'RX'
}

export interface BackupCollisionMatch {
  id: number
  nazev: string
  datum: string
  duvod: 'source_id' | 'nazev_datum'
}

export interface BackupExportResult {
  ok: boolean
  cesta?: string
  zruseno?: boolean
  chyba?: string
}

export interface BackupRestorePreview {
  soubor: string
  scope: BackupScope
  zavod: BackupZavodRow
  appVersion: string
  schemaVersion: number
  exportedAt: string
  pocetZavodu: number
  kolize: BackupCollisionMatch[]
  pocetKategorii: number
  pocetJezdcu: number
}

export type BackupRestoreMode = 'new' | 'overwrite'

export interface BackupRestoreArg {
  soubor: string
  mode: BackupRestoreMode
  targetZavodId?: number
  zavodIndex?: number
}

export interface BackupRestoreResult {
  ok: boolean
  zruseno?: boolean
  chyba?: string
  zavodId?: number
  nazev?: string
}

/** Náhled obnovy, zrušení dialogu, nebo chyba validace (bez zápisu do DB). */
export type BackupPreviewResponse = BackupRestorePreview | { chyba: string } | null

export function isBackupPreview(v: BackupPreviewResponse): v is BackupRestorePreview {
  return v != null && 'zavod' in v
}
