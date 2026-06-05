// Sdílené datové typy — používá je hlavní proces, preload most i React okno.
// Odpovídají datovému modelu z CLAUDE.md §11.

export type RaceType = 'RAC' | 'RX'
export type Ruleset = 'STANDARD'
export type KoloTyp = 'Q1' | 'Q2' | 'Q3' | 'SF' | 'F'
export type Stav = 'OK' | 'DNF' | 'DNS' | 'DQ'

export interface Zavod {
  id: number
  nazev: string
  datum: string // ISO datum YYYY-MM-DD
  misto: string
  typ: RaceType
}

export interface Kategorie {
  id: number
  zavod_id: number
  nazev: string
  ruleset: Ruleset
  /** Počet přihlášených jezdců — dopočítává se z databáze (není to sloupec). */
  pocet: number
}

/** Závod v seznamu na úvodní obrazovce (s dopočtenými počty). */
export interface ZavodInfo extends Zavod {
  pocetKategorii: number
  pocetJezdcu: number
}

/** Jedna kategorie při zakládání závodu. */
export interface KategorieVstup {
  nazev: string
  ruleset: Ruleset
}

/** Vstup pro založení nového závodu. */
export interface NovyZavod {
  nazev: string
  datum: string // ISO YYYY-MM-DD
  misto: string
  typ: RaceType
  kategorie: KategorieVstup[]
}

/** Úprava závodu — volitelně synchronizace seznamu kategorií (přidání / odebrání). */
export interface ZavodUprava {
  id: number
  nazev: string
  datum: string
  misto: string
  /** Když je vyplněno, kategorie závodu se srovnají s tímto seznamem (chybějící se smažou). */
  kategorie?: KategorieVstup[]
}

export interface Jezdec {
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

/** Pole jezdce, která lze inline editovat ve Startovní listině. */
export type JezdecPole = 'los' | 'st_cislo' | 'prijmeni' | 'jmeno' | 'znacka' | 'model'

export interface JezdecUprava {
  id: number
  pole: JezdecPole
  hodnota: string | number | null
}

// ---- Import z Excelu ----

/** Jeden jezdec načtený z Excelu (ještě není v databázi). */
export interface ParsedJezdec {
  los: number | null
  st_cislo: number | null
  prijmeni: string
  jmeno: string
  znacka: string
  model: string
  rok_narozeni: number | null
}

/** Náhled jednoho listu Excelu před zápisem. */
export interface ImportSheetPreview {
  sheet: string // původní název listu v Excelu
  mappedNazev: string // název kategorie po namapování
  kategorieId: number | null // null = kategorie v závodě nenalezena
  pocet: number
  konflikty: number // kolik startovních čísel už v cílové kategorii existuje
  losKolize: number[] // losy, které se v listu opakují (musí být unikátní)
  jezdci: ParsedJezdec[]
}

export interface ImportPreview {
  soubor: string
  listy: ImportSheetPreview[]
}

export type ImportPolicy = 'overwrite' | 'skip'

export interface ImportCommitSheet {
  kategorieId: number
  jezdci: ParsedJezdec[]
}

export interface ImportCommit {
  listy: ImportCommitSheet[]
  policy: ImportPolicy
}

export interface ImportResult {
  vlozeno: number
  prepsano: number
  preskoceno: number
}

// ---- Rošty / Výsledky / Klasifikace ----

/** Jeden slot v roštu jízdy (pozice 1..8). */
export interface RostSlot {
  pozice: number
  jezdec: Jezdec | null
}

export interface RostJizda {
  id: number
  cislo: number
  sloty: RostSlot[]
}

export interface RostKolo {
  koloId: number
  jizdy: RostJizda[]
}

/** Odpověď na zápis st. čísla do slotu roštu. */
export interface SetRostResult {
  ok: boolean // false = nezapsáno (číslo neexistuje, nebo už je v této jízdě)
  jezdec: Jezdec | null
  duplicitni?: boolean // true = číslo je platné, ale jezdec už v té jízdě je
}

/** Návrh automaticky vygenerovaného roštu (před zápisem). */
export interface RostNavrhJizda {
  cislo: number
  jezdci: Jezdec[]
}

export interface RostNavrh {
  ok: boolean
  chyba: string | null // důvod, proč nelze generovat (např. Q3 bez výsledků)
  obsazeno: boolean // v roštu už něco je → přepsat?
  jizdy: RostNavrhJizda[]
  pocetJizd: number // použitý počet jízd
  minJizd: number // nejmenší možný počet (strop 8/jízda)
  maxJizd: number // největší možný počet (1 jezdec/jízda)
  /** U finále: počet finalistů (1..N = finalisté, N+1.. = náhradníci v jizdy[0]). */
  finaleVelikost?: number
}

export interface RostZapisJizda {
  cislo: number
  jezdecIds: number[]
}

/** Řádek celkových výsledků (§9): pořadí řízené finále, body jen z kvalifikace. */
export interface CelkoveRadek {
  poradi: number // celkové pořadí
  jezdec_id: number
  st_cislo: number | null
  prijmeni: string
  jmeno: string
  pq: number | null // pořadí po Q3
  psf: number | null // pořadí v semifinále
  pf: number | null // pořadí ve finále
  bq: number // body z kvalifikace (po Q3)
}

/** Stav závěru závodu pro kategorii (semifinále / finále). */
export interface ZaverStav {
  kvalifikovani: number // počet kvalifikovaných jezdců
  prahSF: number // od kolika se koná SF (12)
  sfSeKona: boolean // kvalifikovaných >= prahSF
  sfHotovo: boolean // SF rošt je vygenerován
  finaleHotovo: boolean // finále je nasazeno
  finaleVelikost: number // 8 nebo 10
}

/** Jeden řádek výsledku jízdy (s vypočteným pořadím a body). */
export interface VysledekRadek {
  vysledek_id: number
  jezdec_id: number
  st_cislo: number | null
  prijmeni: string
  jmeno: string
  znacka: string
  model: string
  namereny_cas_ms: number | null
  /** Časová penalizace ředitele (ms), přičítá se k naměřenému pro řazení. */
  penalizace_ms: number
  stav: Stav
  poradi: number | null
  body: number | null // finální body (override pokud je, jinak automat)
  body_rucni: number | null // ruční override (null = body z automatu)
  rucni_poradi: number | null
  /** Poslední zásah ředitele (pro tooltip / označení řádku). */
  uprava_typ: UpravaTyp | null
  /** Hodnota posledního zásahu (ms u časové, delta bodů u bodové…). */
  uprava_hodnota: number | null
  uprava_duvod: string | null
  uprava_kdy: string | null
}

export interface VysledekJizda {
  id: number
  cislo: number
  vysledky: VysledekRadek[]
}

export interface VysledekKolo {
  koloId: number
  jizdy: VysledekJizda[]
}

// ---- Stopky / měření ----

/** Jeden záznam stopek (jedno kliknutí v cíli). */
export interface MereniRadek {
  id: number
  jizda_id: number
  poradi_kliku: number
  cas_ms: number
  jezdec_id: number | null
  st_cislo: number | null // doplní se přiřazením čísla
  prijmeni: string | null
  jmeno: string | null
}

/** Návrh předvýběru při otevření „Nové měření" — první neodměřená jízda. */
export interface MereniDalsiJizda {
  katId: number
  koloTyp: KoloTyp
  jizdaId: number
}

/** Uložený stav časovače jedné jízdy (běží / pauza, naběhlý čas). */
export interface MereniTimerStav {
  jizdaId: number
  running: boolean
  baseMs: number
  startEpochMs: number | null
}

/** Souběžně rozměřená jízda (kanál) — pro přehled a přepínání. */
export interface MereniKanal {
  jizdaId: number
  kategorieId: number
  koloTyp: KoloTyp
  jizdaCislo: number
  pocet: number // počet zaznamenaných časů
  label: string // „N1600 · Q1 · 1. jízda"
}

/** Odpověď na přiřazení st. čísla k záznamu. */
export interface MereniSetCisloResult {
  ok: boolean
  jezdec: Jezdec | null
  duplicitni?: boolean // číslo platné, ale jezdec už je přiřazen jinému času
}

/** Zadání jednoho výsledku: buď čas (implikuje OK), nebo stav. */
export interface SetVysledekArg {
  jizdaId: number
  jezdecId: number
  cas_ms?: number | null
  stav?: Stav
}

/** Druh zásahu ředitele (audit `uprava_log`, CLAUDE.md §11). */
export type UpravaTyp = 'CASOVA_PENALIZACE' | 'BODOVA_PENALIZACE' | 'POSUN_PORADI' | 'ZRUSENI'

export interface UpravaLogRadek {
  id: number
  vysledek_id: number
  typ: UpravaTyp
  hodnota: number | null
  duvod: string
  rozhodl: string
  kdy: string
  /** Kontext pro přehled (načteno joinem). */
  jezdec_id: number
  st_cislo: number | null
  prijmeni: string
  jmeno: string
  kolo_typ: KoloTyp
  jizda_cislo: number
  kategorie_nazev: string
}

/** Časová penalizace ředitele — hodnota v sekundách (kladné = přičtení). */
export interface CasovaPenalizaceArg {
  jizdaId: number
  jezdecId: number
  /** Celková časová penalizace v sekundách (≥ 0), ukládá se jako penalizace_ms. */
  sekundy: number
  duvod: string
}

/** Bodová penalizace ředitele — úprava o delta vůči automatickým bodům z jízdy. */
export interface BodovaPenalizaceArg {
  jizdaId: number
  jezdecId: number
  /** Přičíst k automatickým bodům (např. −5), nezávisle na čase. */
  delta: number
  duvod: string
}

/** Posun pořadí ředitele — cílová pozice v jízdě (1 = první). */
export interface PosunPoradiArg {
  jizdaId: number
  jezdecId: number
  poradi: number
  duvod: string
}

/** Zrušení jednoho druhu zásahu (nebo všech) u výsledku. */
export interface ZrusPenalizaciArg {
  jizdaId: number
  jezdecId: number
  /** Který druh zrušit; vynecháno = všechny aktivní zásahy ředitele. */
  typ?: 'CASOVA_PENALIZACE' | 'BODOVA_PENALIZACE' | 'POSUN_PORADI'
  duvod: string
}

export interface KlasifikaceRadek {
  poradi: number
  jezdec_id: number
  st_cislo: number | null
  prijmeni: string
  jmeno: string
  /**
   * Los do 1. jízdy (z `jezdec.los`). U Šotoliny rozhoduje shody v klasifikaci
   * (CLAUDE.md §7). U STANDARD se nezobrazuje, ale vrací se vždy.
   */
  los: number | null
  perKolo: Record<string, number> // typ kola → součet bodů
  celkem: number
}

// ---- PDF export ----

/** Řádek agregovaných výsledků Q1 nebo Q2 (všechny jízdy → seřazeno dle času → body). */
export interface QAgregatRadek {
  jezdec_id: number
  st_cislo: number | null
  prijmeni: string
  jmeno: string
  znacka: string | null
  model: string | null
  cislo_jizdy: number
  cas_ms: number | null
  penalizace_ms: number
  /** Bodová penalizace přenesená z jízdy (delta, záporná = odečet). */
  delta_z_jizdy: number
  stav: Stav
  poradi: number | null
  /** Automatické body z pořadí + delta_z_jizdy. */
  body_auto: number | null
  /** Ruční override na úrovni agregátu (null = použij body_auto). */
  body_rucni: number | null
  /** Finální body (body_rucni ?? body_auto). */
  body: number | null
}

/** Identifikuje jeden tiskový list (nadpis + sloupce + data). */
export type ListKey =
  | 'start'
  | 'grid_q1'
  | 'grid_q2'
  | 'grid_q3'
  | 'res_q1'
  | 'res_q2'
  | 'res_q3'
  | 'res_q1_agg'
  | 'res_q2_agg'
  | 'class_q2'
  | 'class_q3'
  // STANDARD (RAC/RX) — semifinále + jedno finále:
  | 'sf_rost'
  | 'sf_res'
  | 'final_rost'
  | 'final_res'
  | 'overall'

export interface ExportPdfResult {
  ok: boolean
  cesta?: string // kam se uložilo (cesta k souboru)
  slozka?: string // složka, kam se uložilo (pro „otevřít složku")
  zruseno?: boolean // uživatel zavřel dialog
  chyba?: string
}

/** Stav kořenové složky pro PDF. */
export interface PdfRootStav {
  root: string | null // nastavená cesta, nebo null (nenastaveno)
  existuje: boolean // existuje fyzicky na disku?
  zruseno?: boolean // uživatel zrušil výběr
}

export interface ExportVseResult {
  ok: boolean
  slozka?: string // do které složky se uložilo
  pocet?: number // kolik PDF se vytvořilo
  zruseno?: boolean
  chyba?: string
}

export interface PrintPresetResult {
  ok: boolean
  vytisteno: number // počet odeslaných tiskových úloh (kopie × listy)
  preskoceno: number // listy přeskočené (chybějící data)
  chyba?: string
}

// ---------------------------------------------------------------------------
// Sportity integrace
// ---------------------------------------------------------------------------

export interface SportitySettingsView {
  apiKeySet: boolean
  apiKeyHint: string | null
}

export interface SportityEventView {
  id: string
  name: string
  password: string
}

export interface SportityNodeView {
  id: string
  name: string
  type: 'Folder' | 'PDF' | 'Text' | 'Image' | 'Link'
  parentId: string | null
}

export interface SportityZavodMapView {
  channelPassword: string
  eventId: string | null
  resultsFolderId: string
  resultsFolderName: string
}

export interface SportityKategorieMapView {
  kategorieId: number
  kategorieNazev: string
  folderId: string | null
  folderName: string | null
}

export interface SportityConnectionResult {
  ok: boolean
  message: string
}

export interface SportityPublishItemResult {
  listKey: string
  nazev: string
  status: 'created' | 'updated' | 'skipped' | 'failed'
  message?: string
}

export interface SportityPublishResult {
  ok: boolean
  created: number
  updated: number
  skipped: number
  failed: number
  items: SportityPublishItemResult[]
}

export interface SportityPublishLogEntry {
  id: number
  kategorieNazev: string | null
  listKey: string | null
  action: string
  status: string
  message: string | null
  createdAt: string
}

/** Tvar API, které preload most vystaví do okna jako `window.api`. */
export interface CasomiraApi {
  /** Platforma hostitele ('darwin' | 'win32' | 'linux') — pro platform-specifické styly. */
  readonly platform: NodeJS.Platform
  /** True pokud okno používá nativní vibrancy/Mica material (macOS vždy, Win11+). */
  readonly nativeVibrancy: boolean
  getAktivniZavod(): Promise<Zavod | null>
  // Správa závodů
  /** Seznam všech závodů (s počty kategorií a jezdců) pro úvodní obrazovku. */
  listZavody(): Promise<ZavodInfo[]>
  /** Otevře závod (nastaví ho jako aktivní) a vrátí ho. */
  openZavod(id: number): Promise<Zavod | null>
  /** Založí nový závod i s kategoriemi, nastaví ho jako aktivní a vrátí ho. */
  createZavod(data: NovyZavod): Promise<Zavod>
  /** Upraví základní údaje závodu (název/datum/místo). */
  updateZavod(uprava: ZavodUprava): Promise<Zavod>
  /** Smaže závod včetně všech jeho dat (kategorie, jezdci, rošty, výsledky). */
  deleteZavod(id: number): Promise<void>
  listKategorie(zavodId: number): Promise<Kategorie[]>
  listJezdci(kategorieId: number): Promise<Jezdec[]>
  updateJezdec(uprava: JezdecUprava): Promise<Jezdec>
  addJezdec(kategorieId: number): Promise<Jezdec>
  deleteJezdec(id: number): Promise<void>
  /** Otevře nativní dialog, načte Excel a vrátí náhled (null = uživatel zrušil). */
  openImport(): Promise<ImportPreview | null>
  /** Zapíše vybrané jezdce do databáze. */
  commitImport(commit: ImportCommit): Promise<ImportResult>
  // Rošty
  getRosty(kategorieId: number, typ: KoloTyp): Promise<RostKolo>
  setRostSlot(jizdaId: number, pozice: number, st_cislo: number | null): Promise<SetRostResult>
  /** Navrhne automatický rošt dle pravidel (§6) — bez zápisu, jen náhled.
   *  `pocetJizd` umožní ruční volbu počtu jízd (jinak vyrovnaný automat). */
  navrhniRost(kategorieId: number, typ: KoloTyp, pocetJizd?: number): Promise<RostNavrh>
  /** Zapíše vygenerovaný rošt do databáze a vrátí nový stav roštu. */
  zapisRost(kategorieId: number, typ: KoloTyp, jizdy: RostZapisJizda[]): Promise<RostKolo>
  // Výsledky (setVysledek vrací přepočtenou jízdu)
  getVysledky(kategorieId: number, typ: KoloTyp): Promise<VysledekKolo>
  setVysledek(arg: SetVysledekArg): Promise<VysledekJizda>
  /** Ruční přepis bodů (null = zrušit override, návrat k automatu). */
  setBodyOverride(jizdaId: number, jezdecId: number, body: number | null): Promise<VysledekJizda>
  /** Časová penalizace ředitele (+X s → přepočet pořadí a bodů). */
  setCasovaPenalizace(arg: CasovaPenalizaceArg): Promise<VysledekJizda>
  /** Bodová penalizace ředitele (delta vůči automatickým bodům z jízdy). */
  setBodovaPenalizace(arg: BodovaPenalizaceArg): Promise<VysledekJizda>
  /** Posun pořadí v jízdě (ostatní se posunou, body z žebříčku). */
  setPosunPoradi(arg: PosunPoradiArg): Promise<VysledekJizda>
  /** Automatická body jezdce v jízdě (bez ručního override) — pro náhled v dialogu. */
  getAutoBodyJizdy(jizdaId: number, jezdecId: number): Promise<number | null>
  /** Zruší penalizaci ředitele (dle typu) a přepočte jízdu. */
  zrusPenalizaci(arg: ZrusPenalizaciArg): Promise<VysledekJizda>
  /** Přehled všech zásahů ředitele v kategorii (audit log). */
  listUpravaLog(kategorieId: number): Promise<UpravaLogRadek[]>
  // Agregované výsledky jednoho kola (Q1/Q2) — seřazeno dle nejlepšího času, body přiděleny
  getQAgregat(kategorieId: number, typ: KoloTyp): Promise<QAgregatRadek[]>
  /** Ruční přepis bodů v agregátu (null = zrušit override, návrat k automatu). */
  setQAgregatBodyOverride(kategorieId: number, typ: KoloTyp, jezdecId: number, body: number | null): Promise<QAgregatRadek[]>
  // Klasifikace (součet bodů přes uvedená kola)
  getKlasifikace(kategorieId: number, koloTypy: KoloTyp[]): Promise<KlasifikaceRadek[]>
  // Závěr závodu — semifinále
  getZaverStav(kategorieId: number): Promise<ZaverStav>
  setFinaleVelikost(kategorieId: number, velikost: number): Promise<void>
  /** Navrhne nasazení semifinále (liché/sudé z Klasifikace po Q3). */
  navrhSF(kategorieId: number): Promise<RostNavrh>
  /** Navrhne nasazení finále (z postupujících SF, nebo z Q3 když SF nebylo). */
  navrhFinale(kategorieId: number): Promise<RostNavrh>
  /** Šotolina — návrh Finále A (10 nejlepších po Q3; pokud B hotovo, 6 z Q3 + 4 z B). */
  /** Šotolina — návrh Finále B (od 11. místa po Q3, max 4 jezdci postupují do A). */
  /** Celkové výsledky závodu (pořadí řízené finále, body z kvalifikace). */
  getCelkove(kategorieId: number): Promise<CelkoveRadek[]>
  // PDF export
  /** Vyexportuje jeden list. Výchozí (saveAs=false) uloží automaticky do
   *  `<kořen>/<závod>/<kategorie>/<list>.pdf`; saveAs=true otevře „Uložit jako…". */
  exportPdf(kategorieId: number, listKey: ListKey, saveAs?: boolean): Promise<ExportPdfResult>
  /** Vyexportuje všechny listy vybraných kategorií do struktury pod kořenovou složkou. */
  exportPdfVse(kategorieIds: number[]): Promise<ExportVseResult>
  /** Závodní tisk — vytiskne preset listů (startovka 1×, rošty 4×, výsledky finále 1×). */
  printPreset(kategorieIds: number[]): Promise<PrintPresetResult>
  /** Vrátí seznam dostupných tiskáren. */
  getTiskarny(): Promise<{ name: string; displayName: string; isDefault: boolean }[]>
  /** Vytiskne jeden list N kopií (volitelně na konkrétní tiskárnu). */
  tiskniList(kategorieId: number, listKey: ListKey, kopii: number, deviceName?: string): Promise<PrintPresetResult>
  // Kořenová složka pro PDF
  /** Vrátí nastavenou kořenovou složku a zda existuje. */
  getPdfRootStav(): Promise<PdfRootStav>
  /** Otevře dialog pro výběr kořenové složky, uloží ji a vrátí nový stav. */
  choosePdfRoot(): Promise<PdfRootStav>
  /** Otevře danou složku v systémovém prohlížeči souborů. */
  openFolder(cesta: string): Promise<void>
  // Logo do hlavičky PDF (uložené globálně jako data URL)
  /** Vrátí aktuální logo (data URL) nebo null. */
  getLogo(): Promise<string | null>
  /** Otevře dialog pro výběr obrázku, uloží ho jako logo a vrátí (null = zrušeno). */
  setLogo(): Promise<string | null>
  /** Odebere uložené logo. */
  clearLogo(): Promise<void>
  // Stopky (samostatné okno)
  /** Otevře (nebo přepne na) okno stopek. */
  openStopky(): Promise<void>
  /** Přihlásí se k odběru události „data se změnila v jiném okně". Vrací odhlášení. */
  onDataChanged(cb: () => void): () => void
  /** Aktivní závod se změnil (otevření / nový závod) — stopky si načtou kanály toho závodu. */
  onZavodChanged(cb: (zavodId: number) => void): () => void
  /** Přehled souběžně rozměřených jízd (kanálů). */
  mereniKanaly(): Promise<MereniKanal[]>
  /** Záznamy měření jedné jízdy (řazené dle pořadí kliku). */
  mereniList(jizdaId: number): Promise<MereniRadek[]>
  /** Zaznamená čas (přidá klik na konec). */
  mereniPridej(jizdaId: number, cas_ms: number): Promise<MereniRadek>
  /** Vrátí (smaže) poslední záznam jízdy. */
  mereniVratPosledni(jizdaId: number): Promise<void>
  /** Ruční oprava jednoho času. */
  mereniOpravCas(id: number, cas_ms: number): Promise<MereniRadek>
  /** Přiřadí startovní číslo k záznamu (null = zrušit). */
  mereniSetCislo(id: number, st_cislo: number | null): Promise<MereniSetCisloResult>
  /** Zahodí celé měření jízdy. */
  mereniSmazKanal(jizdaId: number): Promise<void>
  /** Má daná jízda už zadané výsledky? (pro potvrzení před zápisem) */
  mereniMaVysledky(jizdaId: number): Promise<boolean>
  /** Propíše naměřené časy (s přiřazenými čísly) do Výsledků jízdy. */
  zapisMereniDoVysledku(jizdaId: number): Promise<VysledekJizda>
  /** Vrátí návrh předvýběru (první neodměřená jízda po posledním měření), nebo null. */
  mereniDalsiJizda(): Promise<MereniDalsiJizda | null>
  /** Vrátí jizdaId jízd, které mají záznamy v mereni nebo vysledek (stav „hotovo"). */
  mereniJizdyHotovo(katId: number, koloTyp: KoloTyp): Promise<number[]>
  /** Vrátí sloty roštu konkrétní jízdy (read-only náhled). Prázdné pole = rošt není sestaven. */
  getRostJizda(jizdaId: number): Promise<RostSlot[]>
  /** Uloží stav běžícího časovače jízdy (autosave). */
  ulozMereniTimer(jizdaId: number, stav: MereniTimerStav): Promise<void>
  /** Načte uložené časovače pro aktivní závod. */
  nactiMereniTimery(): Promise<MereniTimerStav[]>
  /** Uloží aktivní kanál (jízdu) pro aktivní závod. */
  ulozMereniAktivniJizdu(jizdaId: number | null): Promise<void>
  nactiMereniAktivniJizdu(): Promise<number | null>
  /** Má aktivní závod rozměřené časy ještě nezapsané do výsledků? */
  mereniMaNezapsane(): Promise<boolean>
  /** Přihlásí se k události „stopky žádají potvrzení zavření". Vrací odhlášení. */
  onStopkyRequestConfirm(cb: () => void): () => void
  /** Potvrdí zavření okna stopek (nebo quit appky) po vlastním modalu. */
  stopkyZavritPotvrzeno(): Promise<void>
  // Záloha / obnova závodu
  /** Uloží jeden závod do JSON (dialog „kam uložit"). */
  exportZavodBackup(zavodId: number): Promise<import('./backup').BackupExportResult>
  /** Uloží všechny závody + globální nastavení do JSON. */
  exportAllBackup(): Promise<import('./backup').BackupExportResult>
  /** Vybere soubor zálohy a vrátí náhled (null = zrušeno). */
  previewRestoreBackup(): Promise<import('./backup').BackupPreviewResponse>
  /** Provede obnovu dle volby uživatele (nový / přepsat). */
  restoreBackup(arg: import('./backup').BackupRestoreArg): Promise<import('./backup').BackupRestoreResult>
  // Sportity integrace
  getSportitySettings(): Promise<SportitySettingsView>
  saveSportityApiKey(apiKey: string): Promise<void>
  clearSportityApiKey(): Promise<void>
  testSportityConnection(): Promise<SportityConnectionResult>
  sportityListEvents(): Promise<SportityEventView[]>
  sportityListDocuments(password: string, eventId?: string | null): Promise<SportityNodeView[]>
  getSportityZavodMap(zavodId: number): Promise<SportityZavodMapView | null>
  saveSportityZavodMap(zavodId: number, channelPassword: string, eventId: string | null, resultsFolderId: string, resultsFolderName: string): Promise<void>
  getSportityKategorieMap(zavodId: number): Promise<SportityKategorieMapView[]>
  saveSportityKategorieMap(kategorieId: number, folderId: string, folderName: string): Promise<void>
  clearSportityKategorieMap(kategorieId: number): Promise<void>
  sportityAutoMapCategories(zavodId: number): Promise<SportityKategorieMapView[]>
  sportityPublishList(kategorieId: number, listKey: string): Promise<SportityPublishResult>
  sportityPublishCategory(kategorieId: number): Promise<SportityPublishResult>
  getSportityPublishLog(zavodId: number): Promise<SportityPublishLogEntry[]>
}
