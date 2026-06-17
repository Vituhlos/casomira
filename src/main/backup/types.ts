// Formát zálohy Verdictu — JSON, verze 1. Sdílené typy pro export/import a UI.

export const BACKUP_FORMAT = 'verdict-backup' as const
export const LEGACY_BACKUP_FORMAT = 'casomira-backup' as const
export const BACKUP_FORMAT_VERSION = 1
export type BackupFormat = typeof BACKUP_FORMAT | typeof LEGACY_BACKUP_FORMAT

export type BackupScope = 'zavod' | 'database'

/** Řádek závodu v záloze (včetně původního id pro detekci kolizí). */
export interface BackupZavodRow {
  id: number
  nazev: string
  datum: string
  misto: string
  typ: 'RAC' | 'RX'
}

export interface BackupKategorieRow {
  id: number
  zavod_id: number
  nazev: string
  ruleset: 'STANDARD' | 'SOTOLINA'
  finale_velikost: number
}

export interface BackupSkupinaRow {
  id: number
  kategorie_id: number
  nazev: string
}

export interface BackupJezdecRow {
  id: number
  kategorie_id: number
  st_cislo: number | null
  prijmeni: string
  jmeno: string
  znacka: string
  model: string
  rok_narozeni: number | null
  los: number | null
}

export interface BackupKoloRow {
  id: number
  kategorie_id: number
  typ: string
  poradi: number
}

export interface BackupJizdaRow {
  id: number
  kolo_id: number
  cislo: number
  skupina_id: number | null
}

export interface BackupRostPoziceRow {
  id: number
  jizda_id: number
  pozice: number
  jezdec_id: number
}

export interface BackupVysledekRow {
  id: number
  jizda_id: number
  jezdec_id: number
  namereny_cas_ms: number | null
  penalizace_ms: number
  stav: string
  body_rucni: number | null
  rucni_poradi: number | null
  poradi: number | null
  body: number | null
  poznamka: string | null
}

export interface BackupMereniRow {
  id: number
  jizda_id: number
  zavod_id?: number | null
  poradi_kliku: number
  cas_ms: number
  jezdec_id: number | null
}

export interface BackupUpravaLogRow {
  id: number
  vysledek_id: number
  typ: string
  hodnota: number | null
  duvod: string
  rozhodl: string
  kdy: string
}

export interface BackupZebricekRow {
  id: number
  ruleset: string
  poradi: number
  body: number
}

export interface BackupPravidlaRow {
  id: number
  ruleset: string
  max_na_jizdu: number
  sf_prah: number | null
  sf_max: number | null
  dnf_offset: number | null
  dns_offset: number | null
  dq_offset: number | null
  dnf_body: number | null
  dns_body: number | null
  dq_body: number | null
}

export interface BackupNastaveniRow {
  klic: string
  hodnota: string
}

/** Kompletní data jednoho závodu (všechny tabulky vázané na závod). */
export interface BackupZavodPayload {
  zavod: BackupZavodRow
  kategorie: BackupKategorieRow[]
  skupiny: BackupSkupinaRow[]
  jezdci: BackupJezdecRow[]
  kola: BackupKoloRow[]
  jizdy: BackupJizdaRow[]
  rost_pozice: BackupRostPoziceRow[]
  vysledky: BackupVysledekRow[]
  mereni: BackupMereniRow[]
  uprava_log: BackupUpravaLogRow[]
}

/** Kořen zálohy — jeden závod nebo celá databáze. */
export interface VerdictBackupFile {
  format: BackupFormat
  formatVersion: number
  appVersion: string
  schemaVersion: number
  exportedAt: string
  scope: BackupScope
  /** U scope=zavod: jeden blok. U scope=database: všechny závody. */
  zavody: BackupZavodPayload[]
  /** Globální tabulky — jen u scope=database (volitelný snapshot u jednoho závodu). */
  zebricek?: BackupZebricekRow[]
  pravidla?: BackupPravidlaRow[]
  nastaveni?: BackupNastaveniRow[]
}

export interface BackupExportResult {
  ok: boolean
  cesta?: string
  zruseno?: boolean
  chyba?: string
}

export interface BackupCollisionMatch {
  id: number
  nazev: string
  datum: string
  /** Proč se závod považuje za shodu (id ze zálohy / stejný název a datum). */
  duvod: 'source_id' | 'nazev_datum'
}

export interface BackupRestorePreview {
  soubor: string
  scope: BackupScope
  zavod: BackupZavodRow
  appVersion: string
  schemaVersion: number
  exportedAt: string
  /** Kolik závodů je v souboru (u scope=database může být > 1). */
  pocetZavodu: number
  /** Shody v aktuální databázi — uživatel volí nový / přepsat / zrušit. */
  kolize: BackupCollisionMatch[]
  /** Počty pro náhled v dialogu. */
  pocetKategorii: number
  pocetJezdcu: number
}

export type BackupRestoreMode = 'new' | 'overwrite'

export interface BackupRestoreArg {
  soubor: string
  mode: BackupRestoreMode
  /** Povinné při mode=overwrite — který existující závod smazat a nahradit. */
  targetZavodId?: number
  /** U scope=database: který index v poli zavody obnovit (výchozí 0). */
  zavodIndex?: number
}

export interface BackupRestoreResult {
  ok: boolean
  zruseno?: boolean
  chyba?: string
  zavodId?: number
  nazev?: string
}
