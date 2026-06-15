import { useCallback, useEffect, useState } from 'react'
import { Surface } from '@heroui/react'
import type { BackupRestorePreview } from '@shared/backup'
import { isBackupPreview } from '@shared/backup'
import type {
  ImportCommit,
  ImportPreview,
  Jezdec,
  JezdecPole,
  Kategorie,
  ListKey,
  PdfRootStav,
  Zavod,
  ZavodInfo
} from '@shared/types'
import { RestoreBackupModal } from './components/RestoreBackupModal'
import { ShellSidebar } from './components/ShellSidebar'
import { ShellToolbar } from './components/ShellToolbar'
import { Modal } from './components/Modal'
import { PhaseSegment } from './ui'
import { ImportDialog } from './components/ImportDialog'
import { ArrowDownToSquare, TrashBin } from '@gravity-ui/icons'
import { Btn } from './components/ui'
import { StartList } from './screens/StartList'
import { QFaze } from './screens/QFaze'
import { Standings } from './screens/Standings'
import { Semifinale, type SubView } from './screens/Semifinale'
import { Finale } from './screens/Finale'
import { Overall } from './screens/Overall'
import { Settings } from './screens/Settings'
import { UpravaLogModal } from './components/UpravaLogModal'
import { RaceList } from './screens/RaceList'
import { RaceDialog } from './screens/RaceDialog'
import { phasesForCategory } from './data/phases'
import { useTheme } from './hooks/useTheme'
import { useHotkeys } from './hooks/useHotkeys'
import { HotkeyHelp } from './components/HotkeyHelp'
import { PrinterPickerModal } from './components/PrinterPickerModal'
import { isMac, HK_GENERATE_ROST } from './lib/hotkeys'
import { safeCall } from './lib/api'

// Fáze, které mají vnitřní přepínač Rošt/Výsledky (zkratky R / V a ⌘/Ctrl+G).
const SUB_PHASES = new Set(['q1', 'q2', 'q3', 'sf', 'final'])

function czDate(iso: string): string {
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3) return iso
  const [y, m, d] = parts
  return `${d}. ${m}. ${y}`
}

// Maximální (čtecí) šířka obsahu podle fáze. Stejná pro pohled Rošt i Výsledky,
// aby se obsah při přepnutí nehýbal do stran (vystředěný sloupec).
function contentMaxWidth(phase: string): number {
  if (phase === 'start') return 880
  if (phase === 'class_q2') return 652
  if (phase === 'class_q3') return 724
  if (phase === 'overall') return 660
  return 1020 // Q1–Q3, semifinále, finále
}

// Počet kopií pro daný list dle závodního presetu (výchozí 1).
const PRESET_KOPII: Partial<Record<ListKey, number>> = {
  grid_q1: 4, grid_q2: 4, grid_q3: 4, sf_rost: 4, final_rost: 4
}

// Která tisková listina odpovídá zobrazené fázi (u Q i SF/finále podle pohledu).
function listProFazi(phase: string, sub: SubView): ListKey | null {
  switch (phase) {
    case 'start':
    case 'class_q2':
    case 'class_q3':
    case 'overall':
      return phase
    case 'q1':
      if (sub === 'res_agg') return 'res_q1_agg'
      return sub === 'res' ? 'res_q1' : 'grid_q1'
    case 'q2':
      if (sub === 'res_agg') return 'res_q2_agg'
      return sub === 'res' ? 'res_q2' : 'grid_q2'
    case 'q3':
      return sub === 'res' ? 'res_q3' : 'grid_q3'
    case 'sf':
      return sub === 'res' ? 'sf_res' : 'sf_rost'
    case 'final':
      return sub === 'res' ? 'final_res' : 'final_rost'
    default:
      return null
  }
}

// Nastavíme synchronně před prvním renderem, aby CSS pravidla html[data-*]
// platila okamžitě — žádný záblesk neprůhledného pozadí při startu.
document.documentElement.dataset.platform = window.api.platform
if (window.api.nativeVibrancy) {
  document.documentElement.dataset.nativeVibrancy = 'true'
}

export function App(): React.JSX.Element {
  const { theme, toggle } = useTheme()
  // Režim obrazovky: seznam závodů (úvod) vs otevřený závod.
  const [view, setView] = useState<'list' | 'race'>('list')
  const [zavody, setZavody] = useState<ZavodInfo[]>([])
  const [novyOtevreno, setNovyOtevreno] = useState(false)
  const [editZavod, setEditZavod] = useState<Zavod | null>(null)
  const [smazatZavod, setSmazatZavod] = useState<ZavodInfo | null>(null)
  const [restorePreview, setRestorePreview] = useState<BackupRestorePreview | null>(null)

  const [zavod, setZavod] = useState<Zavod | null>(null)
  const [kategorie, setKategorie] = useState<Kategorie[]>([])
  const [activeCat, setActiveCat] = useState<number | null>(null)
  const [phase, setPhase] = useState<string>('start')
  // Sub-záložka Rošt/Výsledky u Semifinále a Finále (drží ji App, ať toolbar ví,
  // který list exportovat do PDF). Při změně fáze ji vrátíme na „Rošt".
  const [subView, setSubView] = useState<SubView>('rost')
  const [jezdci, setJezdci] = useState<Jezdec[]>([])

  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [smazat, setSmazat] = useState<Jezdec | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [toastSlozka, setToastSlozka] = useState<string | null>(null)
  const [nastaveniOtevreno, setNastaveniOtevreno] = useState(false)
  const [upravaLogOtevreno, setUpravaLogOtevreno] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [printerPicker, setPrinterPicker] = useState<{
    tiskarny: { name: string; displayName: string; isDefault: boolean }[]
    listKey: ListKey
    kopii: number
  } | null>(null)
  // Problém s kořenovou složkou pro PDF (nenastavená / smazaná) → výzva k výběru.
  const [rootProblem, setRootProblem] = useState<PdfRootStav | null>(null)

  // Krátké oznámení (volitelně s cestou ke složce → tlačítko „Otevřít").
  const oznam = useCallback((text: string, slozka?: string | null): void => {
    setToast(text)
    setToastSlozka(slozka ?? null)
  }, [])

  const reloadZavody = useCallback(async (): Promise<void> => {
    setZavody(await window.api.listZavody())
  }, [])

  // Při startu načteme seznam závodů a ukážeme úvodní obrazovku.
  useEffect(() => {
    void reloadZavody()
  }, [reloadZavody])

  // Ověření kořenové složky pro PDF (první spuštění / smazaná složka).
  useEffect(() => {
    safeCall(
      window.api.getPdfRootStav().then((s) => {
        if (!s.root || !s.existuje) setRootProblem(s)
      }),
      (msg) => oznam(msg)
    )
  }, [])


  // Otevře závod: nastaví ho jako aktivní, načte kategorie a vejde do něj.
  const otevriZavod = useCallback(async (id: number): Promise<void> => {
    const z = await window.api.openZavod(id)
    if (!z) return
    setZavod(z)
    const cats = await window.api.listKategorie(z.id)
    setKategorie(cats)
    const vychozi = cats.find((c) => c.nazev === 'N1600') ?? cats[0]
    setActiveCat(vychozi ? vychozi.id : null)
    setPhase('start')
    setView('race')
  }, [])

  // Zpět na seznam závodů (obnoví počty na kartách).
  const zpetNaSeznam = useCallback((): void => {
    void reloadZavody()
    setView('list')
  }, [reloadZavody])

  const reloadJezdci = useCallback(async (): Promise<void> => {
    if (activeCat == null) return
    setJezdci(await window.api.listJezdci(activeCat))
  }, [activeCat])

  const reloadKategorie = useCallback(async (): Promise<void> => {
    if (!zavod) return
    setKategorie(await window.api.listKategorie(zavod.id))
  }, [zavod])

  // Při změně kategorie načteme její jezdce.
  useEffect(() => {
    void reloadJezdci()
  }, [reloadJezdci])

  // Data se změnila v jiném okně (např. stopky zapsaly výsledky) → obnov jezdce a kategorie.
  // Jednotlivé obrazovky (Results, QVysledky, Overall, Standings, Semifinale, Finale) si
  // samy refreshují svá data přes vlastní onDataChanged subscription.
  useEffect(() => {
    const off = window.api.onDataChanged(() => {
      void reloadJezdci()
      void reloadKategorie()
    })
    return off
  }, [reloadJezdci, reloadKategorie])

  // Při přepnutí fáze nebo kategorie začni vždy u roštu (výchozí pohled).
  useEffect(() => {
    setSubView('rost')
  }, [phase, activeCat])

  // Krátká hláška, která sama zmizí.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => {
      setToast(null)
      setToastSlozka(null)
    }, 5000)
    return () => clearTimeout(t)
  }, [toast])

  // Inline editace: uloží přes DB. Vrací true/false — při kolizi (duplicitní
  // startovní číslo nebo los) se neuloží, oznámí se a buňka se označí.
  const onEdit = async (
    id: number,
    pole: JezdecPole,
    hodnota: string | number | null
  ): Promise<boolean> => {
    try {
      const updated = await window.api.updateJezdec({ id, pole, hodnota })
      setJezdci((prev) => prev.map((d) => (d.id === id ? updated : d)))
      return true
    } catch {
      oznam(
        pole === 'los'
          ? 'Tento los už v této kategorii má jiný jezdec — neuloženo.'
          : pole === 'st_cislo'
            ? 'Toto startovní číslo už v této kategorii existuje — neuloženo.'
            : 'Uložení se nezdařilo — neuloženo.'
      )
      return false
    }
  }

  const onAdd = async (): Promise<void> => {
    if (activeCat == null) return
    await window.api.addJezdec(activeCat)
    await reloadJezdci()
    await reloadKategorie()
  }

  const onConfirmDelete = async (): Promise<void> => {
    if (!smazat) return
    await window.api.deleteJezdec(smazat.id)
    setSmazat(null)
    await reloadJezdci()
    await reloadKategorie()
  }

  const onImport = async (): Promise<void> => {
    const preview = await window.api.openImport()
    if (!preview) return // uživatel zrušil dialog
    setImportPreview(preview)
  }

  const onCommitImport = async (commit: ImportCommit): Promise<void> => {
    const res = await window.api.commitImport(commit)
    setImportPreview(null)
    await reloadJezdci()
    await reloadKategorie()
    oznam(
      `Import hotov — vloženo ${res.vlozeno}, přepsáno ${res.prepsano}, přeskočeno ${res.preskoceno}.`
    )
  }

  // Po založení nového závodu: zavřít dialog, obnovit seznam a rovnou ho otevřít.
  const onSavedNovy = async (z: Zavod): Promise<void> => {
    setNovyOtevreno(false)
    await reloadZavody()
    await otevriZavod(z.id)
  }

  // Po úpravě údajů: obnovit seznam a (je-li otevřený) aktualizovat hlavičku.
  const onSavedEdit = async (z: Zavod): Promise<void> => {
    setEditZavod(null)
    await reloadZavody()
    if (zavod && zavod.id === z.id) {
      setZavod(z)
      const cats = await window.api.listKategorie(z.id)
      setKategorie(cats)
      if (activeCat != null && !cats.some((c) => c.id === activeCat)) {
        setActiveCat(cats[0]?.id ?? null)
        setPhase('start')
      }
    }
  }

  const onZalohovatZavod = async (z: ZavodInfo | Zavod): Promise<void> => {
    const res = await window.api.exportZavodBackup(z.id)
    if (res.ok) oznam('Záloha uložena.', res.cesta)
    else if (!res.zruseno) oznam(res.chyba ?? 'Záloha se nezdařila.')
  }

  const onZalohovatVse = async (): Promise<void> => {
    const res = await window.api.exportAllBackup()
    if (res.ok) oznam('Záloha všech závodů uložena.', res.cesta)
    else if (!res.zruseno) oznam(res.chyba ?? 'Záloha se nezdařila.')
  }

  const onObnovitZeZalohy = async (): Promise<void> => {
    const raw = await window.api.previewRestoreBackup()
    if (raw == null) return
    if (!isBackupPreview(raw)) {
      oznam('chyba' in raw ? raw.chyba : 'Neplatný soubor zálohy.')
      return
    }
    setRestorePreview(raw)
  }

  const onRestoreHotovo = async (zavodId: number): Promise<void> => {
    setRestorePreview(null)
    await reloadZavody()
    await otevriZavod(zavodId)
  }

  const onConfirmDeleteZavod = async (): Promise<void> => {
    if (!smazatZavod) return
    const byloOtevrene = zavod?.id === smazatZavod.id
    await window.api.deleteZavod(smazatZavod.id)
    setSmazatZavod(null)
    await reloadZavody()
    if (byloOtevrene) {
      setZavod(null)
      setView('list')
    }
  }

  // Fáze v liště závisí na typu závodu (RAC/RX) i rulesetu kategorie:
  //   STANDARD: klasická pipeline (SF + Finále, případně bez „Klasifikace po Q2" u RX).
  //   SOTOLINA: místo SF/Finále jede Finále B → Finále A (CLAUDE.md §3c).
  const aktivniKategorie = kategorie.find((c) => c.id === activeCat) ?? null
  const catLabel = aktivniKategorie?.nazev ?? ''
  const phases = phasesForCategory(zavod?.typ ?? 'RAC')
  const phaseLabel = phases.find((p) => p.id === phase)?.label ?? ''
  const contentMaxW = contentMaxWidth(phase)

  // Dynamický titulek okna — operátor vidí kontext i v taskbaru.
  useEffect(() => {
    if (view === 'list') {
      document.title = 'Časomíra'
      return
    }
    const subLabel = SUB_PHASES.has(phase)
      ? subView === 'rost' ? ' Rošt' : ' Výsledky'
      : ''
    document.title = catLabel
      ? `Časomíra — ${catLabel} · ${phaseLabel}${subLabel}`
      : 'Časomíra'
  }, [view, catLabel, phase, phaseLabel, subView])

  // Když se fáze ocitne mimo seznam povolených (přepnutí RAC→RX nebo otevření
  // RX závodu s uloženou „class_q2"), spadni zpět na startovní listinu.
  useEffect(() => {
    if (!phases.some((p) => p.id === phase)) setPhase('start')
  }, [phases, phase])

  const onTabPhase = (id: string): void => {
    if (id === phase) return
    setPhase(id)
    setSubView('rost')
  }

  // Export aktuálního listu. saveAs=false → automaticky do struktury složek.
  const exportujAktualni = async (saveAs: boolean): Promise<void> => {
    if (activeCat == null) {
      oznam('Nejdřív vyber kategorii v levém panelu.')
      return
    }
    const key = listProFazi(phase, subView)
    if (!key) return
    const res = await window.api.exportPdf(activeCat, key, saveAs)
    if (res.ok) oznam('PDF uloženo do složky závodu.', res.slozka)
    else if (!res.zruseno) oznam(res.chyba ?? 'Export PDF se nezdařil.')
  }
  const onPdf = (): Promise<void> => exportujAktualni(false)
  const onPdfSaveAs = (): Promise<void> => exportujAktualni(true)

  const PREF_TISKARNA_KEY = 'casomira.preferovanaTiskarna'

  const onPrint = async (shiftKey = false): Promise<void> => {
    if (activeCat == null) { oznam('Nejdřív vyber kategorii v levém panelu.'); return }
    const key = listProFazi(phase, subView)
    if (!key) return
    const kopii = PRESET_KOPII[key] ?? 1
    const tiskarny = await window.api.getTiskarny()
    // Shift = vynutit výběr tiskárny (změna preference)
    const preferovana = shiftKey ? null : localStorage.getItem(PREF_TISKARNA_KEY)
    const matchTiskarna = preferovana ? tiskarny.find(t => t.name === preferovana) : undefined
    if (matchTiskarna) {
      const res = await window.api.tiskniList(activeCat, key, kopii, matchTiskarna.name)
      if (res.ok) oznam(`Vytištěno ${res.vytisteno}× → ${matchTiskarna.name}`)
      else oznam(res.chyba ?? 'Tisk se nezdařil.')
    } else if (!shiftKey && tiskarny.length === 1) {
      const deviceName = tiskarny[0].name
      const res = await window.api.tiskniList(activeCat, key, kopii, deviceName)
      if (res.ok) oznam(`Vytištěno ${res.vytisteno}× na tiskárnu.`)
      else oznam(res.chyba ?? 'Tisk se nezdařil.')
    } else {
      setPrinterPicker({ tiskarny, listKey: key, kopii })
    }
  }

  const doTiskni = async (deviceName: string): Promise<void> => {
    if (!printerPicker || activeCat == null) return
    setPrinterPicker(null)
    // Zapamatuj si vybranou tiskárnu pro příště
    localStorage.setItem(PREF_TISKARNA_KEY, deviceName)
    const res = await window.api.tiskniList(activeCat, printerPicker.listKey, printerPicker.kopii, deviceName)
    if (res.ok) oznam(`Vytištěno ${res.vytisteno}× → ${deviceName}`)
    else oznam(res.chyba ?? 'Tisk se nezdařil.')
  }

  // Otevře kořenovou složku PDF v průzkumníku (nebo nechá vybrat, když chybí).
  const onOpenPdfFolder = async (): Promise<void> => {
    const stav = await window.api.getPdfRootStav()
    if (stav.root && stav.existuje) {
      await window.api.openFolder(stav.root)
    } else {
      const novy = await window.api.choosePdfRoot()
      if (novy.root && novy.existuje) await window.api.openFolder(novy.root)
    }
  }

  // ---- Klávesové zkratky hlavního okna (u trati). ----
  // Stopky mají vlastní zkratky ve svém okně — ty se sem nepletou.
  const phaseIdx = phases.findIndex((p) => p.id === phase)
  const phaseHasSub = SUB_PHASES.has(phase)
  // Když je otevřený jakýkoli dialog, zkratky neodpalujeme (dialog řeší Esc sám).
  const anyModalOpen =
    novyOtevreno ||
    editZavod !== null ||
    smazatZavod !== null ||
    restorePreview !== null ||
    nastaveniOtevreno ||
    upravaLogOtevreno ||
    rootProblem !== null ||
    importPreview !== null ||
    smazat !== null ||
    helpOpen

  const gotoPhaseIdx = (i: number): void => {
    if (i >= 0 && i < phases.length && phases[i].id !== phase) onTabPhase(phases[i].id)
  }

  useHotkeys({
    enabled: view === 'race' && !anyModalOpen,
    isMac,
    onPrevPhase: () => gotoPhaseIdx(phaseIdx - 1),
    onNextPhase: () => gotoPhaseIdx(phaseIdx + 1),
    onPhaseIndex: gotoPhaseIdx,
    onRost: () => {
      if (phaseHasSub) setSubView('rost')
    },
    onVysledky: () => {
      if (phaseHasSub) setSubView('res')
    },
    onPdf: () => void onPdf(),
    onPdfSaveAs: () => void onPdfSaveAs(),
    onStopky: () => void window.api.openStopky(),
    onGenerateRost: () => window.dispatchEvent(new Event(HK_GENERATE_ROST)),
    onToggleHelp: () => setHelpOpen((o) => !o)
  })

  // Obsah podle vybrané fáze. Rošty/Výsledky/Klasifikace si data tahají samy
  // z databáze podle kategorie a kola.
  const renderPhase = (): React.JSX.Element => {
    if (phase === 'start') {
      return (
        <StartList
          jezdci={jezdci}
          zebra
          onEdit={onEdit}
          onImport={onImport}
          onAdd={onAdd}
          onDelete={setSmazat}
        />
      )
    }
    if (activeCat == null) return <Placeholder label={phaseLabel} />

    switch (phase) {
      case 'q1':
        return <QFaze kategorieId={activeCat} typ="Q1" label="Q1" sub={subView} onSub={setSubView} />
      case 'q2':
        return <QFaze kategorieId={activeCat} typ="Q2" label="Q2" sub={subView} onSub={setSubView} />
      case 'q3':
        return <QFaze kategorieId={activeCat} typ="Q3" label="Q3" sub={subView} onSub={setSubView} />
      case 'sf':
        return <Semifinale kategorieId={activeCat} sub={subView} onSub={setSubView} />
      case 'final':
        return <Finale kategorieId={activeCat} sub={subView} onSub={setSubView} />
      case 'overall':
        return <Overall kategorieId={activeCat} />
      case 'class_q2':
        return (
          <Standings
            kategorieId={activeCat}
            koloTypy={['Q1', 'Q2']}
            title="Klasifikace po Q2"
            ukazLos={false}
          />
        )
      case 'class_q3':
        return (
          <Standings
            kategorieId={activeCat}
            koloTypy={['Q1', 'Q2', 'Q3']}
            title="Klasifikace po Q3"
            ukazLos={false}
          />
        )
      default:
        return <Placeholder label={phaseLabel} />
    }
  }

  return (
    <div className="flex h-full bg-background p-2">
      <Surface
        variant="default"
        className="relative mx-auto flex h-full w-full max-w-[1440px] flex-col overflow-hidden rounded-xl border border-border"
      >
      {view === 'list' ? (
        <RaceList
          zavody={zavody}
          onOpen={(id) => void otevriZavod(id)}
          onNew={() => setNovyOtevreno(true)}
          onEdit={(z) => setEditZavod(z)}
          onDelete={setSmazatZavod}
          onBackup={(z) => void onZalohovatZavod(z)}
          onRestore={() => void onObnovitZeZalohy()}
          theme={theme}
          onToggleTheme={toggle}
        />
      ) : (
        <div className="flex h-full">
          <ShellSidebar
            kategorie={kategorie}
            activeCat={activeCat}
            onCat={setActiveCat}
            onZpet={zpetNaSeznam}
            operator="Časoměřič"
            datum={zavod ? czDate(zavod.datum) : ''}
          />
          <main className="flex flex-1 min-w-0 flex-col bg-background">
            <ShellToolbar
              catLabel={catLabel}
              phaseLabel={phaseLabel}
              theme={theme}
              onToggleTheme={toggle}
              onPdf={() => void onPdf()}
              onPdfSaveAs={() => void onPdfSaveAs()}
              onOpenPdfFolder={() => void onOpenPdfFolder()}
              onPrint={(shiftKey) => void onPrint(shiftKey)}
              onStopky={() => void window.api.openStopky()}
              onSettings={() => setNastaveniOtevreno(true)}
            />
            <PhaseSegment
              phases={phases}
              selectedId={phase}
              onSelect={onTabPhase}
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div
                style={{ maxWidth: contentMaxW, width: '100%', margin: '0 auto' }}
              >
                {renderPhase()}
              </div>
            </div>
          </main>
        </div>
      )}

      {novyOtevreno && (
        <RaceDialog
          mode="new"
          onCancel={() => setNovyOtevreno(false)}
          onSaved={(z) => void onSavedNovy(z)}
        />
      )}

      {editZavod && (
        <RaceDialog
          mode="edit"
          zavod={editZavod}
          onCancel={() => setEditZavod(null)}
          onSaved={(z) => void onSavedEdit(z)}
        />
      )}

      {restorePreview && (
        <RestoreBackupModal
          preview={restorePreview}
          onClose={() => setRestorePreview(null)}
          onDone={(id) => void onRestoreHotovo(id)}
          onToast={oznam}
        />
      )}

      {smazatZavod && (
        <Modal
          title="Smazat závod"
          width={440}
          onClose={() => setSmazatZavod(null)}
          footer={
            <>
              <Btn variant="plain" onClick={() => setSmazatZavod(null)}>
                Zrušit
              </Btn>
              <Btn variant="danger" icon={<TrashBin />} onClick={() => void onConfirmDeleteZavod()}>
                Smazat závod
              </Btn>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 13.5 }}>
            Opravdu smazat závod <b>{smazatZavod.nazev}</b>?
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'color-mix(in srgb, var(--color-foreground) 35%, transparent)' }}>
            Smažou se i všechny jeho kategorie, jezdci, rošty a výsledky. Tuto akci nelze vrátit.
          </p>
        </Modal>
      )}

      {printerPicker && (
        <PrinterPickerModal
          tiskarny={printerPicker.tiskarny}
          onPrint={(deviceName) => void doTiskni(deviceName)}
          onClose={() => setPrinterPicker(null)}
        />
      )}

      {nastaveniOtevreno && (
        <Settings
          kategorie={kategorie}
          onClose={() => setNastaveniOtevreno(false)}
          onToast={oznam}
          onEditZavod={
            zavod
              ? () => {
                  setNastaveniOtevreno(false)
                  setEditZavod(zavod)
                }
              : undefined
          }
          onBackupZavod={
            zavod ? () => void onZalohovatZavod(zavod) : undefined
          }
          onBackupAll={() => void onZalohovatVse()}
          onRestore={() => {
            setNastaveniOtevreno(false)
            void onObnovitZeZalohy()
          }}
          onHotkeys={() => {
            setNastaveniOtevreno(false)
            setHelpOpen(true)
          }}
          onUpravaLog={
            activeCat != null
              ? () => {
                  setNastaveniOtevreno(false)
                  setUpravaLogOtevreno(true)
                }
              : undefined
          }
          zavodId={zavod?.id}
          zavod={zavod ?? undefined}
        />
      )}

      {helpOpen && <HotkeyHelp onClose={() => setHelpOpen(false)} />}

      {upravaLogOtevreno && activeCat != null && (
        <UpravaLogModal
          kategorieId={activeCat}
          kategorieNazev={catLabel}
          onClose={() => setUpravaLogOtevreno(false)}
        />
      )}

      {rootProblem && (
        <Modal
          title="Složka pro PDF"
          width={460}
          onClose={() => setRootProblem(null)}
          footer={
            <>
              <Btn variant="plain" onClick={() => setRootProblem(null)}>
                Později
              </Btn>
              <Btn
                variant="primary"
                icon={<ArrowDownToSquare />}
                onClick={() => {
                  safeCall(
                    window.api.choosePdfRoot().then((s) => {
                      if (s.root && s.existuje) setRootProblem(null)
                      else if (!s.zruseno) setRootProblem(s)
                    }),
                    (msg) => oznam(msg)
                  )
                }}
              >
                Vybrat složku
              </Btn>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
            {rootProblem.root
              ? 'Nastavená kořenová složka pro PDF už neexistuje (byla smazána nebo přesunuta).'
              : 'Vyber kořenovou složku, kam se budou ukládat generovaná PDF.'}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'color-mix(in srgb, var(--color-foreground) 35%, transparent)', lineHeight: 1.55 }}>
            Appka v ní sama vytvoří podsložky <b>závod / kategorie</b>. Data závodů jsou v databázi
            — tohle je jen místo pro PDF. Změnit ji můžeš kdykoliv v <b>Nastavení</b> (ozubené kolo).
          </p>
        </Modal>
      )}

      {importPreview && (
        <ImportDialog
          preview={importPreview}
          onCancel={() => setImportPreview(null)}
          onConfirm={onCommitImport}
        />
      )}

      {smazat && (
        <Modal
          title="Smazat jezdce"
          width={420}
          onClose={() => setSmazat(null)}
          footer={
            <>
              <Btn variant="plain" onClick={() => setSmazat(null)}>
                Zrušit
              </Btn>
              <Btn variant="danger" icon={<TrashBin />} onClick={onConfirmDelete}>
                Smazat
              </Btn>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 13.5 }}>
            Opravdu smazat jezdce{' '}
            <b>
              {smazat.prijmeni} {smazat.jmeno}
            </b>
            {smazat.st_cislo != null && <> (č. {smazat.st_cislo})</>}?
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'color-mix(in srgb, var(--color-foreground) 35%, transparent)' }}>
            Tuto akci nelze vrátit.
          </p>
        </Modal>
      )}

      {toast && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: 22,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            background: 'var(--color-background)',
            color: 'var(--color-foreground)',
            border: '0.5px solid var(--color-border)',
            boxShadow: '0 4px 20px color-mix(in srgb, var(--color-foreground) 14%, transparent)',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            maxWidth: '80vw'
          }}
        >
          <span style={{ minWidth: 0 }}>{toast}</span>
          {toastSlozka && (
            <button
              style={{
                flexShrink: 0,
                height: 24,
                padding: '0 10px',
                borderRadius: 6,
                font: 'inherit',
                fontSize: 12.5,
                fontWeight: 530,
                color: 'var(--color-primary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => void window.api.openFolder(toastSlozka)}
            >
              Otevřít složku
            </button>
          )}
        </div>
      )}
      </Surface>
    </div>
  )
}

// Dočasná výplň pro fáze, které postavíme v dalších krocích.
function Placeholder({ label }: { label: string }): React.JSX.Element {
  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        color: 'color-mix(in srgb, var(--color-foreground) 35%, transparent)',
        fontSize: 14,
        textAlign: 'center'
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 590, color: 'color-mix(in srgb, var(--color-foreground) 55%, transparent)' }}>{label}</div>
        <div style={{ marginTop: 6 }}>Tuto fázi doplníme v dalším kroku.</div>
      </div>
    </div>
  )
}
