// PDF export tiskových listin. Princip dle CLAUDE.md §12: vezmeme stejná data
// jako na obrazovce, vykreslíme je do černobílého tiskového HTML (A4 na výšku,
// tabulka s tenkými černými okraji, šedé záhlaví) a vytiskneme přes skryté okno
// Electronu (webContents.printToPDF). Vzhled je věrnou kopií dnešních listin
// z Excelu, ne kopií appky.

import { app, BrowserWindow, dialog } from 'electron'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type {
  ExportPdfResult,
  ExportVseResult,
  Jezdec,
  KoloTyp,
  ListKey,
  PdfRootStav,
  RostKolo,
  VysledekKolo
} from '../shared/types'
import * as repo from './repo'

// ---------------------------------------------------------------------------
// Popisky a názvy souborů
// ---------------------------------------------------------------------------

// Nadpis listu (do hlavičky), dle zadání uživatele.
const NADPIS: Record<ListKey, string> = {
  start: 'STARTOVNÍ LISTINA',
  grid_q1: 'ROŠTY 1. SÉRIE ROZJÍŽDĚK',
  grid_q2: 'ROŠTY 2. SÉRIE ROZJÍŽDĚK',
  grid_q3: 'ROŠTY 3. SÉRIE ROZJÍŽDĚK',
  res_q1: 'VÝSLEDKY 1. SÉRIE ROZJÍŽDĚK',
  res_q2: 'VÝSLEDKY 2. SÉRIE ROZJÍŽDĚK',
  res_q3: 'VÝSLEDKY 3. SÉRIE ROZJÍŽDĚK',
  res_q1_agg: 'VÝSLEDKY PO Q1',
  res_q2_agg: 'VÝSLEDKY PO Q2',
  class_q2: 'VÝSLEDKY PO DVOU SÉRIÍCH',
  class_q3: 'VÝSLEDKY PO TŘECH SÉRIÍCH',
  sf_rost: 'ROŠTY SEMIFINÁLE',
  sf_res: 'VÝSLEDKY SEMIFINÁLE',
  final_rost: 'ROŠTY FINÁLE',
  final_res: 'VÝSLEDKY FINÁLE',
  overall: 'CELKOVÉ VÝSLEDKY'
}

// Název souboru listu (bez přípony). ASCII kvůli kompatibilitě. Kategorie je
// teď samostatná podsložka, takže název už nemá prefix kategorie.
const SOUBOR: Record<ListKey, string> = {
  start: 'Startovni_listina',
  grid_q1: 'Q1_rosty',
  grid_q2: 'Q2_rosty',
  grid_q3: 'Q3_rosty',
  res_q1: 'Q1_vysledky',
  res_q2: 'Q2_vysledky',
  res_q3: 'Q3_vysledky',
  res_q1_agg: 'Q1_vysledky_po_Q1',
  res_q2_agg: 'Q2_vysledky_po_Q2',
  class_q2: 'Klasifikace_po_Q2',
  class_q3: 'Klasifikace_po_Q3',
  sf_rost: 'Semifinale_rosty',
  sf_res: 'Semifinale_vysledky',
  final_rost: 'Finale_rosty',
  final_res: 'Finale_vysledky',
  overall: 'Celkove_vysledky'
}

// ---------------------------------------------------------------------------
// Pomocné funkce
// ---------------------------------------------------------------------------

function esc(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Čas mm:ss.sss (stejně jako v okně). Vlastní kopie, ať main nesahá do rendereru.
function fmtTime(ms: number | null): string {
  if (ms === null || ms === undefined) return ''
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const mil = ms % 1000
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(mil).padStart(3, '0')}`
}

// Datum a čas tisku, např. „30. 5. 2026 14:07".
function datumCasTisku(): string {
  const d = new Date()
  const cas = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()} ${cas}`
}

// Bezpečný název souboru: odstraní diakritiku a nahradí nepovolené znaky (pro
// název listu — ASCII). Používá se u „Uložit jako…" jako výchozí jméno souboru.
const DIAKRITIKA = new RegExp('[\\u0300-\\u036f]', 'g')
function bezpecnyNazev(s: string): string {
  return s
    .normalize('NFD')
    .replace(DIAKRITIKA, '') // odstraň diakritická znaménka
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Bezpečné jméno složky/souboru pro souborový systém: DIAKRITIKU ZACHOVÁ, jen
// odstraní znaky zakázané ve Windows (/ \ : * ? " < > |) a řídicí znaky; ořeže
// koncové tečky/mezery (Windows je nemá rád).
const FS_RIDICI = new RegExp('[\\u0000-\\u001f]', 'g')
function bezpecneFsJmeno(s: string): string {
  const out = s
    .replace(/[/\\:*?"<>|]/g, ' ') // zakázané znaky → mezera
    .replace(FS_RIDICI, '') // řídicí znaky pryč
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '') // Windows: konec nesmí být tečka/mezera
    .trim()
  return out || 'bez_nazvu'
}

// Cílová složka listu: <kořen>/<závod>/<kategorie>.
function cilovaSlozka(root: string, zavodNazev: string, katNazev: string): string {
  return join(root, bezpecneFsJmeno(zavodNazev), bezpecneFsJmeno(katNazev))
}

// ---------------------------------------------------------------------------
// Tiskový styl (černobílý, A4 na výšku) — společný pro všechny listy
// ---------------------------------------------------------------------------

const STYL = `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Calibri, 'Segoe UI', Arial, sans-serif;
    color: #000; font-size: 12px; line-height: 1.3;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .hlavicka {
    display: flex; align-items: center; gap: 14px;
    border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;
  }
  .logo-box { width: 84px; flex-shrink: 0; }
  .logo-box img { max-width: 84px; max-height: 84px; object-fit: contain; display: block; }
  .titul { flex: 1; text-align: center; }
  .titul h1 {
    margin: 0 0 6px; font-size: 19px; font-weight: 700; letter-spacing: 0.01em;
    text-transform: uppercase;
  }
  .meta { font-size: 11px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 3px 6px; font-size: 12px; vertical-align: middle; }
  th { background: #d9d9d9; font-weight: 700; text-align: left; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .center { text-align: center; }
  tbody tr { page-break-inside: avoid; }
  .jizda-caption { font-weight: 700; font-size: 12.5px; margin: 12px 0 4px; }
  .jizda-blok { display: flex; align-items: stretch; margin-bottom: 12px; page-break-inside: avoid; }
  .jizda-stitek {
    writing-mode: vertical-rl; transform: rotate(180deg);
    display: flex; align-items: center; justify-content: center;
    background: #d9d9d9; border: 1px solid #000; border-right: none;
    font-weight: 700; font-size: 12.5px; width: 26px; flex-shrink: 0;
    letter-spacing: 0.04em;
  }
  .jizda-blok table { border-left: none; }
  .sekce-nadpis { font-weight: 700; font-size: 12px; margin: 10px 0 4px; }
  .nahradnici table { width: 60%; }
`

// Společná hlavička listu.
function hlavicka(
  logo: string | null,
  zavodNazev: string,
  katNazev: string,
  nadpis: string,
  pocet?: number
): string {
  const logoHtml = logo
    ? `<img src="${logo}" alt="" />`
    : ''
  const pocetRadek = pocet != null ? `<div>Počet: ${pocet}</div>` : ''
  return `
  <div class="hlavicka">
    <div class="logo-box">${logoHtml}</div>
    <div class="titul">
      <h1>${esc(katNazev)}&nbsp;&nbsp;${esc(nadpis)}</h1>
      <div class="meta">
        <div>Závod: ${esc(zavodNazev)}</div>
        <div>Datum a čas: ${esc(datumCasTisku())}</div>
        ${pocetRadek}
      </div>
    </div>
    <div class="logo-box"></div>
  </div>`
}

// Obal celého dokumentu.
function dokument(title: string, telo: string): string {
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8" /><title>${esc(title)}</title>
<style>${STYL}</style></head>
<body>${telo}</body></html>`
}

// ---------------------------------------------------------------------------
// Renderery jednotlivých listů (vrací HTML těla)
// ---------------------------------------------------------------------------

const SPORTOVNI_SLOUPCE = ['Po.', 'St. č.', 'Příjmení', 'Jméno', 'Značka', 'Model']

function radekJezdce(poradi: string, j: Jezdec | null, dalsi: string[] = []): string {
  const bunky = [
    `<td class="center">${esc(poradi)}</td>`,
    `<td class="num">${esc(j?.st_cislo ?? '')}</td>`,
    `<td>${esc(j?.prijmeni ?? '')}</td>`,
    `<td>${esc(j?.jmeno ?? '')}</td>`,
    `<td>${esc(j?.znacka ?? '')}</td>`,
    `<td>${esc(j?.model ?? '')}</td>`,
    ...dalsi
  ]
  return `<tr>${bunky.join('')}</tr>`
}

// Startovní listina (řazeno dle startovního čísla).
function listStart(kategorieId: number): { telo: string; pocet: number } {
  const jezdci = repo
    .listJezdci(kategorieId)
    .slice()
    .sort((a, b) => (a.st_cislo ?? Infinity) - (b.st_cislo ?? Infinity))
  const hlavy = SPORTOVNI_SLOUPCE.slice(1) // bez „Po."
  const radky = jezdci
    .map(
      (j) =>
        `<tr><td class="num">${esc(j.st_cislo ?? '')}</td><td>${esc(j.prijmeni)}</td>` +
        `<td>${esc(j.jmeno)}</td><td>${esc(j.znacka)}</td><td>${esc(j.model)}</td></tr>`
    )
    .join('')
  const telo = `<table><thead><tr>${hlavy
    .map((h) => `<th>${h}</th>`)
    .join('')}</tr></thead><tbody>${radky}</tbody></table>`
  return { telo, pocet: jezdci.length }
}

// Rošty (Q / SF / F): svislé štítky jízd + tabulka rozsazení.
// finaleVelikost: pokud je číslo, sloty 1..N = FINÁLE, N+1.. = NÁHRADNÍCI (se jmény).
function listRosty(rost: RostKolo, finaleVelikost: number | false): string {
  const hlava = `<thead><tr>${SPORTOVNI_SLOUPCE.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`
  const bloky = rost.jizdy
    .map((jz) => {
      const sloty = finaleVelikost !== false
        ? jz.sloty.filter((s) => s.pozice <= finaleVelikost)
        : jz.sloty
      const obsazene = sloty.filter((s) => s.jezdec)
      if (obsazene.length === 0 && finaleVelikost === false) return ''
      const radky = sloty.map((s) => radekJezdce(`${s.pozice}.`, s.jezdec)).join('')
      const stitek = rost.jizdy.length > 1 ? `<div class="jizda-stitek">${jz.cislo}. JÍZDA</div>` : ''
      return `
      <div class="jizda-blok">
        ${stitek}
        <table>${hlava}<tbody>${radky}</tbody></table>
      </div>`
    })
    .join('')

  let nahr = ''
  if (finaleVelikost !== false) {
    const nahrSloty = rost.jizdy[0]?.sloty.filter((s) => s.pozice > finaleVelikost) ?? []
    const radkyNahr = nahrSloty.length > 0
      ? nahrSloty.map((s, i) => radekJezdce(`${i + 1}.`, s.jezdec)).join('')
      : `${radekJezdce('1.', null)}${radekJezdce('2.', null)}`
    nahr = `
    <div class="nahradnici">
      <div class="sekce-nadpis">NÁHRADNÍCI</div>
      <table>${hlava}<tbody>${radkyNahr}</tbody></table>
    </div>`
  }

  return (bloky || '<p>Rošt zatím není vytvořený.</p>') + nahr
}

// Výsledky (Q / SF / F): pro každou jízdu tabulka se sloupci Čas a B.
function listVysledky(kolo: VysledekKolo): string {
  const sloupce = [...SPORTOVNI_SLOUPCE, 'Čas', 'B.']
  const hlava = `<thead><tr>${sloupce
    .map((h, i) => `<th${i >= 6 ? ' class="num"' : ''}>${h}</th>`)
    .join('')}</tr></thead>`
  const viceJizd = kolo.jizdy.length > 1

  return (
    kolo.jizdy
      .map((jz) => {
        if (jz.vysledky.length === 0) return ''
        const radky = jz.vysledky
          .map((v) => {
            const cas = v.stav !== 'OK' ? v.stav : fmtTime(v.namereny_cas_ms)
            return (
              `<tr><td class="center">${v.poradi != null ? v.poradi + '.' : ''}</td>` +
              `<td class="num">${esc(v.st_cislo ?? '')}</td>` +
              `<td>${esc(v.prijmeni)}</td><td>${esc(v.jmeno)}</td>` +
              `<td>${esc(v.znacka)}</td><td>${esc(v.model)}</td>` +
              `<td class="num">${esc(cas)}</td>` +
              `<td class="num">${esc(v.body ?? '')}</td></tr>`
            )
          })
          .join('')
        const caption = viceJizd ? `<div class="jizda-caption">${jz.cislo}. JÍZDA</div>` : ''
        return `${caption}<table>${hlava}<tbody>${radky}</tbody></table>`
      })
      .join('') || '<p>Výsledky zatím nejsou zadané.</p>'
  )
}

// Agregované výsledky Q1 / Q2: jedna tabulka, všichni jezdci seřazeni dle času,
// přidán sloupec Jízda (ze které jízdy čas pochází).
function listQAgregat(radky: import('../shared/types').QAgregatRadek[]): string {
  if (radky.length === 0) return '<p>Výsledky zatím nejsou zadané.</p>'
  const sloupce = [...SPORTOVNI_SLOUPCE, 'Čas', 'B.']
  const hlava = `<thead><tr>${sloupce
    .map((h, i) => `<th${i >= 6 ? ' class="num"' : ''}>${h}</th>`)
    .join('')}</tr></thead>`
  const tbody = radky
    .map((r) => {
      const cas = r.stav !== 'OK' ? r.stav : fmtTime(r.cas_ms != null ? r.cas_ms + r.penalizace_ms : null)
      return (
        `<tr><td class="center">${r.poradi != null ? r.poradi + '.' : ''}</td>` +
        `<td class="num">${esc(r.st_cislo ?? '')}</td>` +
        `<td>${esc(r.prijmeni)}</td><td>${esc(r.jmeno)}</td>` +
        `<td>${esc(r.znacka ?? '')}</td><td>${esc(r.model ?? '')}</td>` +
        `<td class="num">${esc(cas)}</td>` +
        `<td class="num">${esc(r.body ?? '')}</td></tr>`
      )
    })
    .join('')
  return `<table>${hlava}<tbody>${tbody}</tbody></table>`
}

// Klasifikace po sériích (Q1·Q2[·Q3]·Cel.). U Šotoliny přibývá sloupec „Los"
// (CLAUDE.md §7) — slouží jako tiebreak při shodě bodů.
function listKlasifikace(kategorieId: number, koloTypy: KoloTyp[], ukazLos: boolean): string {
  const radky = repo.getKlasifikace(kategorieId, koloTypy)
  const jMap = new Map(repo.listJezdci(kategorieId).map((j) => [j.id, j]))
  const serie = koloTypy // např. ['Q1','Q2','Q3']
  const sloupce = [...SPORTOVNI_SLOUPCE, ...(ukazLos ? ['Los'] : []), ...serie, 'Cel.']
  const hlava = `<thead><tr>${sloupce
    .map((h, i) => `<th${i >= 6 ? ' class="num"' : ''}>${esc(h)}</th>`)
    .join('')}</tr></thead>`
  const tela = radky
    .map((r) => {
      const j = jMap.get(r.jezdec_id)
      const losBunka = ukazLos ? `<td class="num">${esc(r.los ?? '')}</td>` : ''
      const serieBunky = serie
        .map((t) => `<td class="num">${esc(r.perKolo[t] ?? 0)}</td>`)
        .join('')
      return (
        `<tr><td class="center">${r.poradi}.</td>` +
        `<td class="num">${esc(r.st_cislo ?? '')}</td>` +
        `<td>${esc(r.prijmeni)}</td><td>${esc(r.jmeno)}</td>` +
        `<td>${esc(j?.znacka ?? '')}</td><td>${esc(j?.model ?? '')}</td>` +
        `${losBunka}${serieBunky}<td class="num">${esc(r.celkem)}</td></tr>`
      )
    })
    .join('')
  return `<table>${hlava}<tbody>${tela}</tbody></table>`
}

// Celkové výsledky (pořadí řízené finále, body z kvalifikace).
function listCelkove(kategorieId: number): string {
  const radky = repo.getCelkove(kategorieId)
  const jMap = new Map(repo.listJezdci(kategorieId).map((j) => [j.id, j]))
  const sloupce = [...SPORTOVNI_SLOUPCE, 'Body']
  const hlava = `<thead><tr>${sloupce
    .map((h, i) => `<th${i >= 6 ? ' class="num"' : ''}>${esc(h)}</th>`)
    .join('')}</tr></thead>`
  const tela = radky
    .map((r) => {
      const j = jMap.get(r.jezdec_id)
      return (
        `<tr><td class="center">${r.poradi}.</td>` +
        `<td class="num">${esc(r.st_cislo ?? '')}</td>` +
        `<td>${esc(r.prijmeni)}</td><td>${esc(r.jmeno)}</td>` +
        `<td>${esc(j?.znacka ?? '')}</td><td>${esc(j?.model ?? '')}</td>` +
        `<td class="num">${esc(r.bq)}</td></tr>`
      )
    })
    .join('')
  return `<table>${hlava}<tbody>${tela}</tbody></table>`
}

// ---------------------------------------------------------------------------
// Sestavení HTML pro daný list
// ---------------------------------------------------------------------------

interface Sestaveno {
  html: string
  listSoubor: string // ASCII název listu bez přípony (Q1_vysledky…)
  zavodNazev: string
  katNazev: string
}

function sestav(kategorieId: number, listKey: ListKey, logo: string | null): Sestaveno {
  // Závod bereme přes kategorii (ne přes „aktivní"), ať PDF sedí i při hromadném
  // exportu napříč kategoriemi a nemíchají se data mezi závody.
  const kat = repo.getKategorieById(kategorieId)
  if (!kat) throw new Error('Kategorie nenalezena.')
  const zavod = repo.getZavodById(kat.zavod_id)
  if (!zavod) throw new Error('Závod nenalezen.')

  const nadpis = NADPIS[listKey]
  let telo: string
  let pocet: number | undefined

  switch (listKey) {
    case 'start': {
      const r = listStart(kategorieId)
      telo = r.telo
      pocet = r.pocet
      break
    }
    case 'grid_q1':
      telo = listRosty(repo.getRosty(kategorieId, 'Q1'), false)
      break
    case 'grid_q2':
      telo = listRosty(repo.getRosty(kategorieId, 'Q2'), false)
      break
    case 'grid_q3':
      telo = listRosty(repo.getRosty(kategorieId, 'Q3'), false)
      break
    case 'res_q1':
      telo = listVysledky(repo.getVysledky(kategorieId, 'Q1'))
      break
    case 'res_q2':
      telo = listVysledky(repo.getVysledky(kategorieId, 'Q2'))
      break
    case 'res_q3':
      telo = listVysledky(repo.getVysledky(kategorieId, 'Q3'))
      break
    case 'res_q1_agg':
      telo = listQAgregat(repo.getQAgregat(kategorieId, 'Q1'))
      break
    case 'res_q2_agg':
      telo = listQAgregat(repo.getQAgregat(kategorieId, 'Q2'))
      break
    case 'class_q2':
      telo = listKlasifikace(kategorieId, ['Q1', 'Q2'], false)
      break
    case 'class_q3':
      telo = listKlasifikace(kategorieId, ['Q1', 'Q2', 'Q3'], false)
      break
    case 'sf_rost':
      telo = listRosty(repo.getRosty(kategorieId, 'SF'), false)
      break
    case 'sf_res':
      telo = listVysledky(repo.getVysledky(kategorieId, 'SF'))
      break
    case 'final_rost': {
      const fv = (repo.getZaverStav(kategorieId) as { finaleVelikost: number }).finaleVelikost
      telo = listRosty(repo.getRosty(kategorieId, 'F'), fv)
      break
    }
    case 'final_res':
      telo = listVysledky(repo.getVysledky(kategorieId, 'F'))
      break
    case 'overall':
      telo = listCelkove(kategorieId)
      break
    default: {
      const _exhaustive: never = listKey
      throw new Error(`Neznámý list: ${String(_exhaustive)}`)
    }
  }

  const html = dokument(
    `${kat.nazev} ${nadpis}`,
    hlavicka(logo, zavod.nazev, kat.nazev, nadpis, pocet) + telo
  )
  return { html, listSoubor: SOUBOR[listKey], zavodNazev: zavod.nazev, katNazev: kat.nazev }
}

// ---------------------------------------------------------------------------
// Tisk HTML → PDF přes skryté okno
// ---------------------------------------------------------------------------

async function withTiskoveOkno<T>(fn: (win: BrowserWindow) => Promise<T>): Promise<T> {
  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 1200,
    webPreferences: { sandbox: true, offscreen: false }
  })
  try {
    return await fn(win)
  } finally {
    win.destroy()
  }
}

async function tiskni(win: BrowserWindow, html: string): Promise<Buffer> {
  const tmp = join(
    app.getPath('temp'),
    `casomira-print-${Date.now()}-${Math.random().toString(36).slice(2)}.html`
  )
  await writeFile(tmp, html, 'utf8')
  try {
    await win.loadFile(tmp)
    const data = await win.webContents.printToPDF({
      pageSize: 'A4',
      landscape: false,
      printBackground: true,
      preferCSSPageSize: true
    })
    return Buffer.from(data)
  } finally {
    void unlink(tmp).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Kořenová složka pro PDF
// ---------------------------------------------------------------------------

export function pdfRootStav(): PdfRootStav {
  const root = repo.getPdfRoot()
  return { root, existuje: !!root && existsSync(root) }
}

// Otevře dialog pro výběr kořenové složky a uloží ji.
export async function choosePdfRoot(parentWin: BrowserWindow | null): Promise<PdfRootStav> {
  const dlg = {
    title: 'Vyber kořenovou složku pro PDF',
    properties: ['openDirectory' as const, 'createDirectory' as const]
  }
  const res = parentWin ? await dialog.showOpenDialog(parentWin, dlg) : await dialog.showOpenDialog(dlg)
  if (res.canceled || res.filePaths.length === 0) {
    return { ...pdfRootStav(), zruseno: true }
  }
  repo.setPdfRoot(res.filePaths[0])
  return pdfRootStav()
}

// Vrátí platnou kořenovou složku; když není nastavená/neexistuje, nechá vybrat.
async function zajistiRoot(parentWin: BrowserWindow | null): Promise<string | null> {
  const stav = pdfRootStav()
  if (stav.root && stav.existuje) return stav.root
  const novy = await choosePdfRoot(parentWin)
  return novy.root && novy.existuje ? novy.root : null
}

// ---------------------------------------------------------------------------
// Veřejné API
// ---------------------------------------------------------------------------

export async function exportJeden(
  parentWin: BrowserWindow | null,
  kategorieId: number,
  listKey: ListKey,
  logo: string | null,
  saveAs = false
): Promise<ExportPdfResult> {
  let s: Sestaveno
  try {
    s = sestav(kategorieId, listKey, logo)
  } catch (e) {
    return { ok: false, chyba: e instanceof Error ? e.message : 'Chyba při sestavení listu.' }
  }

  // Kam uložit: „Uložit jako…" = dialog; jinak automaticky do struktury složek.
  let cilSouboru: string
  let cilSlozky: string
  if (saveAs) {
    const dlg = {
      title: 'Uložit PDF jako…',
      defaultPath: `${bezpecnyNazev(s.katNazev)}_${s.listSoubor}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    }
    const res = parentWin
      ? await dialog.showSaveDialog(parentWin, dlg)
      : await dialog.showSaveDialog(dlg)
    if (res.canceled || !res.filePath) return { ok: false, zruseno: true }
    cilSouboru = res.filePath
    cilSlozky = dirname(res.filePath) // nadřazená složka zvoleného souboru
  } else {
    const root = await zajistiRoot(parentWin)
    if (!root) return { ok: false, zruseno: true }
    cilSlozky = cilovaSlozka(root, s.zavodNazev, s.katNazev)
    cilSouboru = join(cilSlozky, `${s.listSoubor}.pdf`)
  }

  try {
    await mkdir(cilSlozky, { recursive: true })
    const buf = await withTiskoveOkno((win) => tiskni(win, s.html))
    await writeFile(cilSouboru, buf)
    return { ok: true, cesta: cilSouboru, slozka: cilSlozky }
  } catch (e) {
    return { ok: false, chyba: e instanceof Error ? e.message : 'Tisk PDF se nezdařil.' }
  }
}

// Pořadí listů pro hromadný export (dle pipeline) — STANDARD kategorie
// (RAC/RX). SF se přidá jen když se koná. RX vynechává „Klasifikace po Q2".
const PORADI_STANDARD: ListKey[] = [
  'start',
  'grid_q1',
  'res_q1',
  'grid_q2',
  'res_q2',
  'class_q2',
  'grid_q3',
  'res_q3',
  'class_q3',
  'sf_rost',
  'sf_res',
  'final_rost',
  'final_res',
  'overall'
]


export async function exportVse(
  parentWin: BrowserWindow | null,
  kategorieIds: number[],
  logo: string | null
): Promise<ExportVseResult> {
  if (kategorieIds.length === 0) return { ok: false, chyba: 'Není vybraná žádná kategorie.' }

  const root = await zajistiRoot(parentWin)
  if (!root) return { ok: false, zruseno: true }

  try {
    let pocet = 0
    await withTiskoveOkno(async (win) => {
      for (const katId of kategorieIds) {
        const kat = repo.getKategorieById(katId)
        const zavod = kat ? repo.getZavodById(kat.zavod_id) : null
        const jeRX = zavod?.typ === 'RX'
        const stav = repo.getZaverStav(katId)

        for (const key of PORADI_STANDARD) {
          if (jeRX && key === 'class_q2') continue
          if ((key === 'sf_rost' || key === 'sf_res') && !stav.sfSeKona) continue
          const s = sestav(katId, key, logo)
          const slozka = cilovaSlozka(root, s.zavodNazev, s.katNazev)
          await mkdir(slozka, { recursive: true })
          const buf = await tiskni(win, s.html)
          await writeFile(join(slozka, `${s.listSoubor}.pdf`), buf)
          pocet++
        }
      }
    })
    return { ok: true, slozka: root, pocet }
  } catch (e) {
    return { ok: false, chyba: e instanceof Error ? e.message : 'Hromadný export se nezdařil.' }
  }
}
