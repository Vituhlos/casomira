import { contextBridge, ipcRenderer } from 'electron'
import type { BackupRestoreArg } from '../shared/backup'
import type {
  CasomiraApi,
  ImportCommit,
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


// Vystavíme do okna jen tyto konkrétní funkce (žádný přímý přístup k Node ani
// k databázi). Každá jen pošle zprávu hlavnímu procesu a počká na odpověď.
const api: CasomiraApi = {
  getAktivniZavod: () => ipcRenderer.invoke('zavod:aktivni'),
  listZavody: () => ipcRenderer.invoke('zavod:list'),
  openZavod: (id: number) => ipcRenderer.invoke('zavod:open', id),
  createZavod: (data: NovyZavod) => ipcRenderer.invoke('zavod:create', data),
  updateZavod: (uprava: ZavodUprava) => ipcRenderer.invoke('zavod:update', uprava),
  deleteZavod: (id: number) => ipcRenderer.invoke('zavod:delete', id),
  exportZavodBackup: (zavodId: number) => ipcRenderer.invoke('backup:exportZavod', zavodId),
  exportAllBackup: () => ipcRenderer.invoke('backup:exportAll'),
  previewRestoreBackup: () => ipcRenderer.invoke('backup:previewRestore'),
  restoreBackup: (arg: BackupRestoreArg) => ipcRenderer.invoke('backup:restore', arg),
  listKategorie: (zavodId: number) => ipcRenderer.invoke('kategorie:list', zavodId),
  listJezdci: (kategorieId: number) => ipcRenderer.invoke('jezdci:list', kategorieId),
  updateJezdec: (uprava: JezdecUprava) => ipcRenderer.invoke('jezdec:update', uprava),
  addJezdec: (kategorieId: number) => ipcRenderer.invoke('jezdec:add', kategorieId),
  deleteJezdec: (id: number) => ipcRenderer.invoke('jezdec:delete', id),
  openImport: () => ipcRenderer.invoke('excel:open'),
  commitImport: (commit: ImportCommit) => ipcRenderer.invoke('excel:commit', commit),
  getRosty: (kategorieId: number, typ: KoloTyp) => ipcRenderer.invoke('rosty:get', kategorieId, typ),
  setRostSlot: (jizdaId: number, pozice: number, st_cislo: number | null) =>
    ipcRenderer.invoke('rosty:setSlot', jizdaId, pozice, st_cislo),
  navrhniRost: (kategorieId: number, typ: KoloTyp, pocetJizd?: number) =>
    ipcRenderer.invoke('rosty:navrhni', kategorieId, typ, pocetJizd),
  zapisRost: (kategorieId: number, typ: KoloTyp, jizdy: RostZapisJizda[]) =>
    ipcRenderer.invoke('rosty:zapis', kategorieId, typ, jizdy),
  getVysledky: (kategorieId: number, typ: KoloTyp) =>
    ipcRenderer.invoke('vysledky:get', kategorieId, typ),
  setVysledek: (arg: SetVysledekArg) => ipcRenderer.invoke('vysledky:set', arg),
  setBodyOverride: (jizdaId: number, jezdecId: number, body: number | null) =>
    ipcRenderer.invoke('vysledky:body', jizdaId, jezdecId, body),
  setCasovaPenalizace: (arg: CasovaPenalizaceArg) =>
    ipcRenderer.invoke('vysledky:casovaPenalizace', arg),
  setBodovaPenalizace: (arg: BodovaPenalizaceArg) =>
    ipcRenderer.invoke('vysledky:bodovaPenalizace', arg),
  getAutoBodyJizdy: (jizdaId: number, jezdecId: number) =>
    ipcRenderer.invoke('vysledky:autoBody', jizdaId, jezdecId),
  setPosunPoradi: (arg: PosunPoradiArg) => ipcRenderer.invoke('vysledky:posunPoradi', arg),
  zrusPenalizaci: (arg: ZrusPenalizaciArg) =>
    ipcRenderer.invoke('vysledky:zrusPenalizaci', arg),
  listUpravaLog: (kategorieId: number) => ipcRenderer.invoke('uprava:list', kategorieId),
  getKlasifikace: (kategorieId: number, koloTypy: KoloTyp[]) =>
    ipcRenderer.invoke('klasifikace:get', kategorieId, koloTypy),
  getZaverStav: (kategorieId: number) => ipcRenderer.invoke('zaver:stav', kategorieId),
  setFinaleVelikost: (kategorieId: number, velikost: number) =>
    ipcRenderer.invoke('zaver:finaleVelikost', kategorieId, velikost),
  navrhSF: (kategorieId: number) => ipcRenderer.invoke('zaver:navrhSF', kategorieId),
  navrhFinale: (kategorieId: number) => ipcRenderer.invoke('zaver:navrhFinale', kategorieId),
  navrhFinaleA: (kategorieId: number) => ipcRenderer.invoke('zaver:navrhFinaleA', kategorieId),
  navrhFinaleB: (kategorieId: number) => ipcRenderer.invoke('zaver:navrhFinaleB', kategorieId),
  getCelkove: (kategorieId: number) => ipcRenderer.invoke('zaver:celkove', kategorieId),
  exportPdf: (kategorieId: number, listKey: ListKey, saveAs?: boolean) =>
    ipcRenderer.invoke('pdf:export', kategorieId, listKey, saveAs),
  exportPdfVse: (kategorieIds: number[]) => ipcRenderer.invoke('pdf:exportVse', kategorieIds),
  getPdfRootStav: () => ipcRenderer.invoke('pdf:rootStav'),
  choosePdfRoot: () => ipcRenderer.invoke('pdf:chooseRoot'),
  openFolder: (cesta: string) => ipcRenderer.invoke('shell:openFolder', cesta),
  getLogo: () => ipcRenderer.invoke('logo:get'),
  setLogo: () => ipcRenderer.invoke('logo:set'),
  clearLogo: () => ipcRenderer.invoke('logo:clear'),
  // Stopky
  openStopky: () => ipcRenderer.invoke('stopky:open'),
  onDataChanged: (cb: () => void) => {
    const h = (): void => cb()
    ipcRenderer.on('app:dataChanged', h)
    return () => ipcRenderer.removeListener('app:dataChanged', h)
  },
  onZavodChanged: (cb: (zavodId: number) => void) => {
    const h = (_e: unknown, id: number): void => cb(id)
    ipcRenderer.on('app:zavodChanged', h)
    return () => ipcRenderer.removeListener('app:zavodChanged', h)
  },
  mereniKanaly: () => ipcRenderer.invoke('mereni:kanaly'),
  mereniList: (jizdaId: number) => ipcRenderer.invoke('mereni:list', jizdaId),
  mereniPridej: (jizdaId: number, cas_ms: number) =>
    ipcRenderer.invoke('mereni:pridej', jizdaId, cas_ms),
  mereniVratPosledni: (jizdaId: number) => ipcRenderer.invoke('mereni:vratPosledni', jizdaId),
  mereniOpravCas: (id: number, cas_ms: number) => ipcRenderer.invoke('mereni:opravCas', id, cas_ms),
  mereniSetCislo: (id: number, st_cislo: number | null) =>
    ipcRenderer.invoke('mereni:setCislo', id, st_cislo),
  mereniSmazKanal: (jizdaId: number) => ipcRenderer.invoke('mereni:smazKanal', jizdaId),
  mereniMaVysledky: (jizdaId: number) => ipcRenderer.invoke('mereni:maVysledky', jizdaId),
  zapisMereniDoVysledku: (jizdaId: number) => ipcRenderer.invoke('mereni:zapis', jizdaId),
  getRostJizda: (jizdaId: number) => ipcRenderer.invoke('rost:jizda', jizdaId),
  mereniDalsiJizda: () => ipcRenderer.invoke('mereni:dalsiJizda'),
  mereniJizdyHotovo: (katId: number, koloTyp: KoloTyp) =>
    ipcRenderer.invoke('mereni:jizdyHotovo', katId, koloTyp),
  ulozMereniTimer: (jizdaId: number, stav: import('../shared/types').MereniTimerStav) =>
    ipcRenderer.invoke('mereni:ulozTimer', jizdaId, stav),
  nactiMereniTimery: () => ipcRenderer.invoke('mereni:nactiTimery'),
  ulozMereniAktivniJizdu: (jizdaId: number | null) =>
    ipcRenderer.invoke('mereni:ulozAktivni', jizdaId),
  nactiMereniAktivniJizdu: () => ipcRenderer.invoke('mereni:nactiAktivni'),
  mereniMaNezapsane: () => ipcRenderer.invoke('mereni:maNezapsane'),
  onStopkyRequestConfirm: (cb: () => void) => {
    const h = (): void => cb()
    ipcRenderer.on('stopky:requestConfirm', h)
    return () => ipcRenderer.removeListener('stopky:requestConfirm', h)
  },
  stopkyZavritPotvrzeno: () => ipcRenderer.invoke('stopky:zavritPotvrzeno')
}

contextBridge.exposeInMainWorld('api', api)
