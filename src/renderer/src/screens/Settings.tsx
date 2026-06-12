import { useEffect, useState } from 'react'
import type { Kategorie, PdfRootStav, Zavod } from '@shared/types'
import { Button } from '@heroui/react'
import { Modal } from '../components/Modal'
import { ArrowDownToSquare, FileLetterP, Keyboard, Pencil, TrashBin } from '@gravity-ui/icons'
import { Btn } from '../components/ui'
import { TiskovyPresetModal } from '../components/TiskovyPresetModal'
import { SportityModal } from '../components/SportityModal'
import { APP_NAME, APP_VERSION, APP_VERSION_LABEL } from '../lib/version'
import { safeCall } from '../lib/api'

const T2 = 'color-mix(in srgb, var(--color-foreground) 55%, transparent)'
const T3 = 'color-mix(in srgb, var(--color-foreground) 35%, transparent)'
const T4 = 'color-mix(in srgb, var(--color-foreground) 22%, transparent)'
const CARD_ALT = 'color-mix(in srgb, var(--color-foreground) 4%, transparent)'
const DIVIDER = 'var(--color-border)'

interface SettingsProps {
  kategorie: Kategorie[]
  onClose: () => void
  onToast: (zprava: string) => void
  onEditZavod?: () => void
  onBackupZavod?: () => void
  onBackupAll?: () => void
  onRestore?: () => void
  onHotkeys?: () => void
  onUpravaLog?: () => void
  zavodId?: number
  zavod?: Zavod
}

export function Settings({
  kategorie,
  onClose,
  onToast,
  onEditZavod,
  onBackupZavod,
  onBackupAll,
  onRestore,
  onHotkeys,
  onUpravaLog,
  zavodId,
  zavod
}: SettingsProps): React.JSX.Element {
  const [logo, setLogo] = useState<string | null>(null)
  const [root, setRoot] = useState<PdfRootStav | null>(null)
  const [vybrane, setVybrane] = useState<Set<number>>(new Set(kategorie.map((k) => k.id)))
  const [probiha, setProbiha] = useState(false)
  const [ukazPreset, setUkazPreset] = useState(false)
  const [ukazSportity, setUkazSportity] = useState(false)

  useEffect(() => {
    safeCall(window.api.getLogo().then(setLogo), onToast)
    safeCall(window.api.getPdfRootStav().then(setRoot), onToast)
  }, [])

  const zmenitSlozku = async (): Promise<void> => {
    const s = await window.api.choosePdfRoot()
    if (!s.zruseno) {
      setRoot(s)
      onToast('Kořenová složka pro PDF nastavena.')
    }
  }

  const nahrat = async (): Promise<void> => {
    const url = await window.api.setLogo()
    if (url) {
      setLogo(url)
      onToast('Logo nahráno — objeví se v hlavičce PDF.')
    }
  }

  const odebrat = async (): Promise<void> => {
    await window.api.clearLogo()
    setLogo(null)
    onToast('Logo odebráno.')
  }

  const prepni = (id: number): void => {
    setVybrane((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const vse = vybrane.size === kategorie.length
  const prepniVse = (): void =>
    setVybrane(vse ? new Set() : new Set(kategorie.map((k) => k.id)))

  const exportuj = async (): Promise<void> => {
    if (vybrane.size === 0 || probiha) return
    setProbiha(true)
    try {
      const res = await window.api.exportPdfVse([...vybrane])
      if (res.ok) onToast(`Hotovo — ${res.pocet} PDF uloženo do: ${res.slozka}`)
      else if (!res.zruseno) onToast(res.chyba ?? 'Hromadný export se nezdařil.')
    } finally {
      setProbiha(false)
    }
  }

  return (
    <>
    <Modal
      title="Nastavení"
      width={520}
      onClose={onClose}
      footer={
        <Btn variant="plain" onClick={onClose}>
          Zavřít
        </Btn>
      }
    >
      {onEditZavod && (
        <>
          <SekceNadpis>Závod a kategorie</SekceNadpis>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: T2, lineHeight: 1.5 }}>
            Přidat nebo odebrat kategorie, upravit název, datum a místo závodu.
          </p>
          <Btn variant="bezel" icon={<Pencil />} onClick={onEditZavod}>
            Upravit závod…
          </Btn>
          <Hairline />
        </>
      )}

      <SekceNadpis>Záloha a obnova</SekceNadpis>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: T2, lineHeight: 1.5 }}>
        Kompletní data závodu (rošty, výsledky, stopky, penalizace) do souboru JSON. Ostatní závody
        v databázi zůstanou nedotčené.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {onBackupZavod && (
          <Btn variant="bezel" icon={<ArrowDownToSquare />} onClick={onBackupZavod}>
            Zálohovat tento závod…
          </Btn>
        )}
        {onBackupAll && (
          <Btn variant="bezel" icon={<ArrowDownToSquare />} onClick={onBackupAll}>
            Zálohovat vše…
          </Btn>
        )}
        {onRestore && (
          <Btn variant="bezel" icon={<ArrowDownToSquare />} onClick={onRestore}>
            Obnovit ze zálohy…
          </Btn>
        )}
      </div>

      <Hairline />

      {/* ---- Logo ---- */}
      <SekceNadpis>Logo do hlavičky PDF</SekceNadpis>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 96,
            height: 96,
            flexShrink: 0,
            border: '0.5px solid var(--color-border)',
            borderRadius: 6,
            background: CARD_ALT,
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden'
          }}
        >
          {logo ? (
            <img
              src={logo}
              alt="logo"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: 11.5, color: T4, textAlign: 'center', padding: 8 }}>
              žádné logo
            </span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="bezel" icon={<ArrowDownToSquare />} onClick={() => void nahrat()}>
              {logo ? 'Změnit logo…' : 'Nahrát logo…'}
            </Btn>
            {logo && (
              <Btn variant="plain" icon={<TrashBin />} onClick={() => void odebrat()}>
                Odebrat
              </Btn>
            )}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: T3, lineHeight: 1.5 }}>
            PNG / JPG. Objeví se vlevo v hlavičce všech PDF. Bez loga zůstane místo prázdné a PDF
            funguje dál.
          </p>
        </div>
      </div>

      <Hairline />

      {/* ---- Kořenová složka pro PDF ---- */}
      <SekceNadpis>Složka pro PDF</SekceNadpis>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 12px',
          border: '0.5px solid var(--color-border)',
          borderRadius: 6,
          background: CARD_ALT
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            color: root?.root ? 'var(--color-foreground)' : T3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={root?.root ?? ''}
        >
          {root?.root ?? 'zatím nenastaveno'}
          {root?.root && !root.existuje && (
            <span style={{ color: 'var(--color-danger)' }}> — složka neexistuje!</span>
          )}
        </span>
        {root?.root && root.existuje && (
          <Btn variant="plain" onClick={() => void window.api.openFolder(root.root as string)}>
            Otevřít
          </Btn>
        )}
        <Btn variant="bezel" icon={<ArrowDownToSquare />} onClick={() => void zmenitSlozku()}>
          Změnit složku…
        </Btn>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 11.5, color: T3, lineHeight: 1.5 }}>
        Sem se ukládají PDF do struktury <b>závod / kategorie</b>. „Uložit PDF" ukládá automaticky
        bez ptaní; „Uložit jako…" (šipka u tlačítka) umožní výjimku jinam.
      </p>

      <Hairline />

      {/* ---- Závodní tisk ---- */}
      <SekceNadpis>Závodní tisk</SekceNadpis>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: T2, lineHeight: 1.5 }}>
        Rychlý tisk standardní sady listů na výchozí tiskárnu: startovka 1×, rošty Q1–Q3 a finále 4×,
        výsledky finále 1×.
      </p>
      <Btn variant="bezel" icon={<FileLetterP />} onClick={() => setUkazPreset(true)}>
        Závodní tisk…
      </Btn>

      <Hairline />

      {/* ---- Hromadný export ---- */}
      <SekceNadpis>Hromadný export do PDF</SekceNadpis>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: T2, lineHeight: 1.5 }}>
        Vygeneruje <b>všechny listy</b> vybraných kategorií (startovní listina, rošty, výsledky,
        klasifikace, semifinále/finále, celkově) do struktury pod kořenovou složkou.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 560 }}>Kategorie ({vybrane.size})</span>
        <Button variant="ghost" size="sm" onPress={prepniVse}>
          {vse ? 'Zrušit výběr' : 'Vybrat vše'}
        </Button>
      </div>

      <div
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          border: '0.5px solid var(--color-border)',
          borderRadius: 6
        }}
      >
        {kategorie.map((k, i) => (
          <label
            key={k.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 12px',
              fontSize: 13,
              cursor: 'pointer',
              borderTop: i === 0 ? 'none' : `0.5px solid ${DIVIDER}`
            }}
          >
            <input
              type="checkbox"
              checked={vybrane.has(k.id)}
              onChange={() => prepni(k.id)}
              style={{ accentColor: 'var(--color-primary)', width: 15, height: 15 }}
            />
            <span style={{ fontWeight: 540 }}>{k.nazev}</span>
            <span style={{ marginLeft: 'auto', color: T3, fontSize: 12 }}>
              {k.pocet} jezdců
            </span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <Btn
          variant="primary"
          icon={<FileLetterP />}
          onClick={() => void exportuj()}
          disabled={probiha || vybrane.size === 0}
        >
          {probiha ? 'Exportuji…' : 'Exportovat vše'}
        </Btn>
      </div>

      {(onHotkeys || onUpravaLog) && (
        <>
          <Hairline />
          <SekceNadpis>Nástroje</SekceNadpis>
          {onUpravaLog && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: T2, lineHeight: 1.5 }}>
                Přehled ručních zásahů ředitele závodu v aktuální kategorii (penalizace, posuny pořadí).
              </p>
              <Btn variant="bezel" onClick={onUpravaLog} style={{ marginBottom: 14 }}>
                Zásahy ředitele…
              </Btn>
            </>
          )}
          {onHotkeys && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: T2, lineHeight: 1.5 }}>
                Přepínání fází i Rošt/Výsledky, uložení PDF, stopky a další — ať operátor u trati nehoní
                myš. Modifikátor se přizpůsobí systému (⌘ na macOS, Ctrl na Windows).
              </p>
              <Btn variant="bezel" icon={<Keyboard />} onClick={onHotkeys}>
                Klávesové zkratky…
              </Btn>
            </>
          )}
        </>
      )}

      <Hairline />

      {/* ---- Sportity ---- */}
      <SekceNadpis>Sportity</SekceNadpis>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: T2, lineHeight: 1.5 }}>
        Publikování PDF výsledků přímo do aplikace Sportity (live výsledky pro diváky).
      </p>
      {zavodId && zavod ? (
        <Btn variant="bezel" onClick={() => setUkazSportity(true)}>
          Nastavit Sportity…
        </Btn>
      ) : (
        <span style={{ fontSize: 12.5, color: T4 }}>Nejprve otevřete závod.</span>
      )}

      <Hairline />

      {/* ---- O aplikaci ---- */}
      <SekceNadpis>O aplikaci</SekceNadpis>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
          border: '0.5px solid var(--color-border)',
          borderRadius: 6,
          background: CARD_ALT
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 8,
            background: 'linear-gradient(160deg,#8a8d93,#5c5f66)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.02em'
          }}
        >
          ČM
        </span>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>
            {APP_NAME}{' '}
            <span className="tnum" style={{ color: T3, fontWeight: 500 }}>
              {APP_VERSION_LABEL}
            </span>
          </div>
          <div style={{ fontSize: 12, color: T3 }}>
            Správce závodu autokros / rallycross · © {new Date().getFullYear()}
          </div>
        </div>
        <span
          className="tnum"
          style={{ fontSize: 11.5, color: T4 }}
          title="Verze z package.json"
        >
          build {APP_VERSION}
        </span>
      </div>
    </Modal>

    {ukazPreset && (
      <TiskovyPresetModal
        kategorie={kategorie}
        onClose={() => setUkazPreset(false)}
        onToast={onToast}
      />
    )}

    {ukazSportity && zavodId != null && zavod != null && (
      <SportityModal
        zavodId={zavodId}
        zavod={zavod}
        kategorie={kategorie}
        onClose={() => setUkazSportity(false)}
        onToast={onToast}
      />
    )}
  </>
  )
}

function SekceNadpis({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h3 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 620 }}>
      {children}
    </h3>
  )
}

function Hairline(): React.JSX.Element {
  return <div style={{ height: 1, background: 'var(--color-border)', margin: '18px 0' }} />
}
