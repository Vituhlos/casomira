import { useCallback, useEffect, useState } from 'react'
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
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { Segmented } from './components/Segmented'
import { Modal } from './components/Modal'
import { ImportDialog } from './components/ImportDialog'
import { Btn } from './components/ui'
import { StartList } from './screens/StartList'
import { QFaze } from './screens/QFaze'
import { Standings } from './screens/Standings'
import { Semifinale, type SubView } from './screens/Semifinale'
import { Finale } from './screens/Finale'
import { FinaleAB } from './screens/FinaleAB'
import { Overall } from './screens/Overall'
import { Settings } from './screens/Settings'
import { UpravaLogModal } from './components/UpravaLogModal'
import { RaceList } from './screens/RaceList'
import { RaceDialog } from './screens/RaceDialog'
import { phasesForCategory } from './data/phases'
import { useTheme } from './hooks/useTheme'

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

// Která tisková listina odpovídá zobrazené fázi (u Q i SF/finále podle pohledu).
function listProFazi(phase: string, sub: SubView): ListKey | null {
  switch (phase) {
    case 'start':
    case 'class_q2':
    case 'class_q3':
    case 'overall':
      return phase
    case 'q1':
      return sub === 'res' ? 'res_q1' : 'grid_q1'
    case 'q2':
      return sub === 'res' ? 'res_q2' : 'grid_q2'
    case 'q3':
      return sub === 'res' ? 'res_q3' : 'grid_q3'
    case 'sf':
      return sub === 'res' ? 'sf_res' : 'sf_rost'
    case 'final':
      return sub === 'res' ? 'final_res' : 'final_rost'
    case 'final_b':
      return sub === 'res' ? 'final_b_res' : 'final_b_rost'
    case 'final_a':
      return sub === 'res' ? 'final_a_res' : 'final_a_rost'
    default:
      return null
  }
}

export function App(): React.JSX.Element {
  const { theme, toggle } = useTheme()
  // Režim obrazovky: seznam závodů (úvod) vs otevřený závod.
  const [view, setView] = useState<'list' | 'race'>('list')
  const [zavody, setZavody] = useState<ZavodInfo[]>([])
  const [novyOtevreno, setNovyOtevreno] = useState(false)
  const [editZavod, setEditZavod] = useState<ZavodInfo | null>(null)
  const [smazatZavod, setSmazatZavod] = useState<ZavodInfo | null>(null)

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
  // Problém s kořenovou složkou pro PDF (nenastavená / smazaná) → výzva k výběru.
  const [rootProblem, setRootProblem] = useState<PdfRootStav | null>(null)
  // Zvýší se, když jiné okno změní data → vynutí přenačtení obsahu.
  const [dataNonce, setDataNonce] = useState(0)

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
    void window.api.getPdfRootStav().then((s) => {
      if (!s.root || !s.existuje) setRootProblem(s)
    })
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

  // Data se změnila v jiném okně (např. stopky zapsaly výsledky) → obnov pohled.
  useEffect(() => {
    const off = window.api.onDataChanged(() => {
      setDataNonce((n) => n + 1)
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
    if (zavod && zavod.id === z.id) setZavod(z)
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
  const jeSotolina = aktivniKategorie?.ruleset === 'SOTOLINA'
  const phases = phasesForCategory(
    zavod?.typ ?? 'RAC',
    aktivniKategorie?.ruleset ?? 'STANDARD'
  )
  const phaseLabel = phases.find((p) => p.id === phase)?.label ?? ''
  const contentMaxW = contentMaxWidth(phase)

  // Když se fáze ocitne mimo seznam povolených (přepnutí RAC→RX nebo otevření
  // RX závodu s uloženou „class_q2"), spadni zpět na startovní listinu.
  useEffect(() => {
    if (!phases.some((p) => p.id === phase)) setPhase('start')
  }, [phases, phase])

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
      case 'final_b':
        return (
          <FinaleAB
            kategorieId={activeCat}
            varianta="B"
            sub={subView}
            onSub={setSubView}
          />
        )
      case 'final_a':
        return (
          <FinaleAB
            kategorieId={activeCat}
            varianta="A"
            sub={subView}
            onSub={setSubView}
          />
        )
      case 'overall':
        return <Overall kategorieId={activeCat} jeSotolina={jeSotolina} />
      case 'class_q2':
        return (
          <Standings
            kategorieId={activeCat}
            koloTypy={['Q1', 'Q2']}
            title="Klasifikace po Q2"
            ukazLos={jeSotolina}
          />
        )
      case 'class_q3':
        return (
          <Standings
            kategorieId={activeCat}
            koloTypy={['Q1', 'Q2', 'Q3']}
            title="Klasifikace po Q3"
            ukazLos={jeSotolina}
          />
        )
      default:
        return <Placeholder label={phaseLabel} />
    }
  }

  return (
    <>
      {view === 'list' ? (
        <RaceList
          zavody={zavody}
          onOpen={(id) => void otevriZavod(id)}
          onNew={() => setNovyOtevreno(true)}
          onEdit={setEditZavod}
          onDelete={setSmazatZavod}
          theme={theme}
          onToggleTheme={toggle}
        />
      ) : (
        <div style={{ display: 'flex', height: '100%' }}>
          <Sidebar
            kategorie={kategorie}
            activeCat={activeCat}
            onCat={setActiveCat}
            onZpet={zpetNaSeznam}
            operator="Časoměřič"
            datum={zavod ? czDate(zavod.datum) : ''}
          />
          <main
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--content-bg)'
            }}
          >
            <Toolbar
              catLabel={catLabel}
              phaseLabel={phaseLabel}
              raceTyp={zavod?.typ}
              theme={theme}
              onToggleTheme={toggle}
              onPdf={() => void onPdf()}
              onPdfSaveAs={() => void onPdfSaveAs()}
              onOpenPdfFolder={() => void onOpenPdfFolder()}
              onStopky={() => void window.api.openStopky()}
              onUpravaLog={
                activeCat != null ? () => setUpravaLogOtevreno(true) : undefined
              }
              onSettings={() => setNastaveniOtevreno(true)}
            />
            {/* Lišta fází: záložky vystředěné jako kompaktní blok (vodorovný scroll
                až když se na úzkém okně nevejdou). Seznam fází zužujeme podle
                typu závodu (RX bez „Klasifikace po Q2"). */}
            <Segmented active={phase} phases={phases} onTab={setPhase} />
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div
                key={dataNonce}
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
              <Btn variant="danger" icon="trash" onClick={() => void onConfirmDeleteZavod()}>
                Smazat závod
              </Btn>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 13.5 }}>
            Opravdu smazat závod <b>{smazatZavod.nazev}</b>?
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>
            Smažou se i všechny jeho kategorie, jezdci, rošty a výsledky. Tuto akci nelze vrátit.
          </p>
        </Modal>
      )}

      {nastaveniOtevreno && (
        <Settings
          kategorie={kategorie}
          onClose={() => setNastaveniOtevreno(false)}
          onToast={oznam}
        />
      )}

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
                icon="import"
                onClick={() => {
                  void window.api.choosePdfRoot().then((s) => {
                    if (s.root && s.existuje) setRootProblem(null)
                    else if (!s.zruseno) setRootProblem(s)
                  })
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
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.55 }}>
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
              <Btn variant="danger" icon="trash" onClick={onConfirmDelete}>
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
          <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--text-3)' }}>
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
            background: 'var(--card)',
            color: 'var(--text-1)',
            border: '0.5px solid var(--hairline)',
            boxShadow: 'var(--shadow-win)',
            borderRadius: 'var(--r-ctrl)',
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
              className="btn btn--plain"
              onClick={() => void window.api.openFolder(toastSlozka)}
              style={{
                flexShrink: 0,
                height: 24,
                padding: '0 10px',
                borderRadius: 6,
                font: 'inherit',
                fontSize: 12.5,
                fontWeight: 530,
                color: 'var(--accent-text)'
              }}
            >
              Otevřít složku
            </button>
          )}
        </div>
      )}
    </>
  )
}

// Dočasná výplň pro fáze, které postavíme v dalších krocích.
function Placeholder({ label }: { label: string }): React.JSX.Element {
  return (
    <div
      className="screen-enter"
      style={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-3)',
        fontSize: 14,
        textAlign: 'center'
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 590, color: 'var(--text-2)' }}>{label}</div>
        <div style={{ marginTop: 6 }}>Tuto fázi doplníme v dalším kroku.</div>
      </div>
    </div>
  )
}
