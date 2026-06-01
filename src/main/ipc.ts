import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import type {
  ImportCommit,
  ImportPreview,
  JezdecUprava,
  KoloTyp,
  ListKey,
  NovyZavod,
  RostZapisJizda,
  BodovaPenalizaceArg,
  CasovaPenalizaceArg,
  PosunPoradiArg,
  SetVysledekArg,
  ZrusPenalizaciArg,
  ZavodUprava
} from '../shared/types'
import * as repo from './repo'
import { exportJeden, exportVse, pdfRootStav, choosePdfRoot } from './pdf'
import { openStopky, broadcast } from './windows'

// Z přípony odvodí MIME typ obrázku (pro data URL loga).
function mimeObrazku(cesta: string): string {
  const ext = extname(cesta).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.svg') return 'image/svg+xml'
  return 'image/png'
}

// Most mezi oknem (React) a daty. Okno nikdy nesahá do databáze ani na disk
// přímo — jen pošle zprávu přes tyto kanály a hlavní proces odpoví.
export function registerIpc(): void {
  ipcMain.handle('zavod:aktivni', () => repo.getAktivniZavod())
  ipcMain.handle('zavod:list', () => repo.listZavody())
  ipcMain.handle('zavod:open', (_e, id: number) => repo.openZavod(id))
  ipcMain.handle('zavod:create', (_e, data: NovyZavod) => repo.createZavod(data))
  ipcMain.handle('zavod:update', (_e, uprava: ZavodUprava) => repo.updateZavod(uprava))
  ipcMain.handle('zavod:delete', (_e, id: number) => repo.deleteZavod(id))
  ipcMain.handle('kategorie:list', (_e, zavodId: number) => repo.listKategorie(zavodId))
  ipcMain.handle('jezdci:list', (_e, kategorieId: number) => repo.listJezdci(kategorieId))
  ipcMain.handle('jezdec:update', (_e, uprava: JezdecUprava) => repo.updateJezdec(uprava))
  ipcMain.handle('jezdec:add', (_e, kategorieId: number) => repo.addJezdec(kategorieId))
  ipcMain.handle('jezdec:delete', (_e, id: number) => repo.deleteJezdec(id))

  ipcMain.handle('excel:open', async (e): Promise<ImportPreview | null> => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = {
      title: 'Vyber soubor se seznamem jezdců',
      filters: [{ name: 'Excel (.xls, .xlsx)', extensions: ['xls', 'xlsx'] }],
      properties: ['openFile' as const]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (res.canceled || res.filePaths.length === 0) return null
    return repo.buildImportPreview(res.filePaths[0])
  })

  ipcMain.handle('excel:commit', (_e, commit: ImportCommit) => repo.importJezdci(commit))

  // Rošty / Výsledky / Klasifikace
  ipcMain.handle('rosty:get', (_e, kategorieId: number, typ: KoloTyp) =>
    repo.getRosty(kategorieId, typ)
  )
  ipcMain.handle('rosty:setSlot', (_e, jizdaId: number, pozice: number, st_cislo: number | null) =>
    repo.setRostSlot(jizdaId, pozice, st_cislo)
  )
  ipcMain.handle('rosty:navrhni', (_e, kategorieId: number, typ: KoloTyp, pocetJizd?: number) =>
    repo.navrhniRost(kategorieId, typ, pocetJizd)
  )
  ipcMain.handle('rosty:zapis', (_e, kategorieId: number, typ: KoloTyp, jizdy: RostZapisJizda[]) =>
    repo.zapisRost(kategorieId, typ, jizdy)
  )
  ipcMain.handle('vysledky:get', (_e, kategorieId: number, typ: KoloTyp) =>
    repo.getVysledky(kategorieId, typ)
  )
  ipcMain.handle('vysledky:set', (_e, arg: SetVysledekArg) => repo.setVysledek(arg))
  ipcMain.handle('vysledky:body', (_e, jizdaId: number, jezdecId: number, body: number | null) =>
    repo.setBodyOverride(jizdaId, jezdecId, body)
  )
  ipcMain.handle('vysledky:casovaPenalizace', (_e, arg: CasovaPenalizaceArg) => {
    const v = repo.setCasovaPenalizace(arg)
    broadcast('app:dataChanged')
    return v
  })
  ipcMain.handle('vysledky:bodovaPenalizace', (_e, arg: BodovaPenalizaceArg) => {
    const v = repo.setBodovaPenalizace(arg)
    broadcast('app:dataChanged')
    return v
  })
  ipcMain.handle('vysledky:autoBody', (_e, jizdaId: number, jezdecId: number) =>
    repo.getAutoBodyJizdy(jizdaId, jezdecId)
  )
  ipcMain.handle('vysledky:posunPoradi', (_e, arg: PosunPoradiArg) => {
    const v = repo.setPosunPoradi(arg)
    broadcast('app:dataChanged')
    return v
  })
  ipcMain.handle('vysledky:zrusPenalizaci', (_e, arg: ZrusPenalizaciArg) => {
    const v = repo.zrusPenalizaci(arg)
    broadcast('app:dataChanged')
    return v
  })
  ipcMain.handle('uprava:list', (_e, kategorieId: number) => repo.listUpravaLog(kategorieId))
  ipcMain.handle('klasifikace:get', (_e, kategorieId: number, koloTypy: KoloTyp[]) =>
    repo.getKlasifikace(kategorieId, koloTypy)
  )

  // Závěr závodu
  ipcMain.handle('zaver:stav', (_e, kategorieId: number) => repo.getZaverStav(kategorieId))
  ipcMain.handle('zaver:finaleVelikost', (_e, kategorieId: number, velikost: number) =>
    repo.setFinaleVelikost(kategorieId, velikost)
  )
  ipcMain.handle('zaver:navrhSF', (_e, kategorieId: number) => repo.navrhSF(kategorieId))
  ipcMain.handle('zaver:navrhFinale', (_e, kategorieId: number) => repo.navrhFinale(kategorieId))
  ipcMain.handle('zaver:navrhFinaleA', (_e, kategorieId: number) => repo.navrhFinaleA(kategorieId))
  ipcMain.handle('zaver:navrhFinaleB', (_e, kategorieId: number) => repo.navrhFinaleB(kategorieId))
  ipcMain.handle('zaver:celkove', (_e, kategorieId: number) => repo.getCelkove(kategorieId))

  // PDF export jednoho listu. saveAs=false → automaticky do struktury složek;
  // saveAs=true → dialog „Uložit jako…".
  ipcMain.handle('pdf:export', (e, kategorieId: number, listKey: ListKey, saveAs?: boolean) =>
    exportJeden(BrowserWindow.fromWebContents(e.sender), kategorieId, listKey, repo.getLogo(), saveAs)
  )

  // Hromadný export: všechny listy vybraných kategorií do struktury pod kořenem.
  ipcMain.handle('pdf:exportVse', (e, kategorieIds: number[]) =>
    exportVse(BrowserWindow.fromWebContents(e.sender), kategorieIds, repo.getLogo())
  )

  // Stopky (samostatné okno) + měření
  ipcMain.handle('stopky:open', () => openStopky())
  ipcMain.handle('mereni:kanaly', () => repo.mereniKanaly())
  ipcMain.handle('mereni:list', (_e, jizdaId: number) => repo.mereniList(jizdaId))
  ipcMain.handle('mereni:pridej', (_e, jizdaId: number, cas: number) =>
    repo.mereniPridej(jizdaId, cas)
  )
  ipcMain.handle('mereni:vratPosledni', (_e, jizdaId: number) => repo.mereniVratPosledni(jizdaId))
  ipcMain.handle('mereni:opravCas', (_e, id: number, cas: number) => repo.mereniOpravCas(id, cas))
  ipcMain.handle('mereni:setCislo', (_e, id: number, st: number | null) =>
    repo.mereniSetCislo(id, st)
  )
  ipcMain.handle('mereni:smazKanal', (_e, jizdaId: number) => repo.mereniSmazKanal(jizdaId))
  ipcMain.handle('mereni:maVysledky', (_e, jizdaId: number) => repo.mereniMaVysledky(jizdaId))
  ipcMain.handle('rost:jizda', (_e, jizdaId: number) => repo.getRostJizda(jizdaId))
  ipcMain.handle('mereni:dalsiJizda', () => repo.mereniDalsiJizda())
  ipcMain.handle('mereni:jizdyHotovo', (_e, katId: number, koloTyp: KoloTyp) =>
    repo.mereniJizdyHotovo(katId, koloTyp)
  )
  ipcMain.handle('mereni:zapis', (_e, jizdaId: number) => {
    const v = repo.zapisMereniDoVysledku(jizdaId)
    broadcast('app:dataChanged') // hlavní okno si obnoví výsledky
    return v
  })

  // Kořenová složka pro PDF
  ipcMain.handle('pdf:rootStav', () => pdfRootStav())
  ipcMain.handle('pdf:chooseRoot', (e) => choosePdfRoot(BrowserWindow.fromWebContents(e.sender)))
  ipcMain.handle('shell:openFolder', (_e, cesta: string) => {
    void shell.openPath(cesta)
  })

  // Logo do hlavičky PDF
  ipcMain.handle('logo:get', () => repo.getLogo())
  ipcMain.handle('logo:clear', () => repo.deleteNastaveni('logo'))
  ipcMain.handle('logo:set', async (e): Promise<string | null> => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = {
      title: 'Vyber obrázek loga',
      filters: [{ name: 'Obrázky', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'] }],
      properties: ['openFile' as const]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (res.canceled || res.filePaths.length === 0) return null
    const cesta = res.filePaths[0]
    const data = await readFile(cesta)
    const url = `data:${mimeObrazku(cesta)};base64,${data.toString('base64')}`
    repo.setNastaveni('logo', url)
    return url
  })
}
