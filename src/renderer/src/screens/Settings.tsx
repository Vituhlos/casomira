import { useEffect, useState } from 'react'
import { Checkbox, Separator, toast } from '@heroui/react'
import type { Kategorie, PdfRootStav, Zavod } from '@shared/types'
import { Modal } from '../components/Modal'
import { Btn } from '../components/ui'
import { TiskovyPresetModal } from '../components/TiskovyPresetModal'
import { SportityModal } from '../components/SportityModal'
import { APP_NAME, APP_VERSION, APP_VERSION_LABEL } from '../lib/version'
import { safeCall } from '../lib/api'

interface SettingsProps {
  kategorie: Kategorie[]
  onClose: () => void
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
    safeCall(window.api.getLogo().then(setLogo), (msg) => toast.danger(msg))
    safeCall(window.api.getPdfRootStav().then(setRoot), (msg) => toast.danger(msg))
  }, [])

  const zmenitSlozku = async (): Promise<void> => {
    const s = await window.api.choosePdfRoot()
    if (!s.zruseno) {
      setRoot(s)
      toast.success('Kořenová složka pro PDF nastavena.')
    }
  }

  const nahrat = async (): Promise<void> => {
    const url = await window.api.setLogo()
    if (url) {
      setLogo(url)
      toast.success('Logo nahráno — objeví se v hlavičce PDF.')
    }
  }

  const odebrat = async (): Promise<void> => {
    await window.api.clearLogo()
    setLogo(null)
    toast('Logo odebráno.')
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
      if (res.ok) toast.success(`Hotovo — ${res.pocet} PDF uloženo do: ${res.slozka}`)
      else if (!res.zruseno) toast.danger(res.chyba ?? 'Hromadný export se nezdařil.')
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
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            Přidat nebo odebrat kategorie, upravit název, datum a místo závodu.
          </p>
          <Btn variant="bezel" icon="pencil" onClick={onEditZavod}>
            Upravit závod…
          </Btn>
          <Separator className="my-[18px]" />
        </>
      )}

      <SekceNadpis>Záloha a obnova</SekceNadpis>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        Kompletní data závodu (rošty, výsledky, stopky, penalizace) do souboru JSON. Ostatní závody
        v databázi zůstanou nedotčené.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {onBackupZavod && (
          <Btn variant="bezel" icon="import" onClick={onBackupZavod}>
            Zálohovat tento závod…
          </Btn>
        )}
        {onBackupAll && (
          <Btn variant="bezel" icon="import" onClick={onBackupAll}>
            Zálohovat vše…
          </Btn>
        )}
        {onRestore && (
          <Btn variant="bezel" icon="import" onClick={onRestore}>
            Obnovit ze zálohy…
          </Btn>
        )}
      </div>

      <Separator className="my-[18px]" />

      {/* ---- Logo ---- */}
      <SekceNadpis>Logo do hlavičky PDF</SekceNadpis>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 96,
            height: 96,
            flexShrink: 0,
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface-secondary)',
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
            <span style={{ fontSize: 11.5, color: 'var(--text-4)', textAlign: 'center', padding: 8 }}>
              žádné logo
            </span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="bezel" icon="import" onClick={() => void nahrat()}>
              {logo ? 'Změnit logo…' : 'Nahrát logo…'}
            </Btn>
            {logo && (
              <Btn variant="plain" icon="trash" onClick={() => void odebrat()}>
                Odebrat
              </Btn>
            )}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            PNG / JPG. Objeví se vlevo v hlavičce všech PDF. Bez loga zůstane místo prázdné a PDF
            funguje dál.
          </p>
        </div>
      </div>

      <Separator className="my-[18px]" />

      {/* ---- Kořenová složka pro PDF ---- */}
      <SekceNadpis>Složka pro PDF</SekceNadpis>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 12px',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          background: 'var(--surface-secondary)'
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12.5,
            color: root?.root ? 'var(--foreground)' : 'var(--muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={root?.root ?? ''}
        >
          {root?.root ?? 'zatím nenastaveno'}
          {root?.root && !root.existuje && (
            <span style={{ color: 'var(--danger)' }}> — složka neexistuje!</span>
          )}
        </span>
        {root?.root && root.existuje && (
          <Btn variant="plain" onClick={() => void window.api.openFolder(root.root as string)}>
            Otevřít
          </Btn>
        )}
        <Btn variant="bezel" icon="import" onClick={() => void zmenitSlozku()}>
          Změnit složku…
        </Btn>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        Sem se ukládají PDF do struktury <b>závod / kategorie</b>. „Uložit PDF" ukládá automaticky
        bez ptaní; „Uložit jako…" (šipka u tlačítka) umožní výjimku jinam.
      </p>

      <Separator className="my-[18px]" />

      {/* ---- Závodní tisk ---- */}
      <SekceNadpis>Závodní tisk</SekceNadpis>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        Rychlý tisk standardní sady listů na výchozí tiskárnu: startovka 1×, rošty Q1–Q3 a finále 4×,
        výsledky finále 1×.
      </p>
      <Btn variant="bezel" icon="pdf" onClick={() => setUkazPreset(true)}>
        Závodní tisk…
      </Btn>

      <Separator className="my-[18px]" />

      {/* ---- Hromadný export ---- */}
      <SekceNadpis>Hromadný export do PDF</SekceNadpis>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        Vygeneruje <b>všechny listy</b> vybraných kategorií (startovní listina, rošty, výsledky,
        klasifikace, semifinále/finále, celkově) do struktury pod kořenovou složkou.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 560 }}>Kategorie ({vybrane.size})</span>
        <button className="bg-transparent text-[var(--accent)] hover:bg-black/[.045] dark:hover:bg-white/[.06] border-none cursor-pointer transition-[background] duration-[130ms] ease-linear focus-visible:outline-none" onClick={prepniVse} style={maleLink}>
          {vse ? 'Zrušit výběr' : 'Vybrat vše'}
        </button>
      </div>

      <div
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)'
        }}
      >
        {kategorie.map((k, i) => (
          <Checkbox
            key={k.id}
            isSelected={vybrane.has(k.id)}
            onChange={() => prepni(k.id)}
            className="w-full gap-[10px] cursor-pointer"
            style={{
              padding: '7px 12px',
              fontSize: 13,
              borderTop: i === 0 ? 'none' : '0.5px solid var(--separator)'
            }}
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content className="flex-1">
              <span style={{ fontWeight: 540 }}>{k.nazev}</span>
            </Checkbox.Content>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>{k.pocet} jezdců</span>
          </Checkbox>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <Btn
          variant="primary"
          icon="pdf"
          onClick={() => void exportuj()}
          disabled={probiha || vybrane.size === 0}
        >
          {probiha ? 'Exportuji…' : 'Exportovat vše'}
        </Btn>
      </div>

      {(onHotkeys || onUpravaLog) && (
        <>
          <Separator className="my-[18px]" />
          <SekceNadpis>Nástroje</SekceNadpis>
          {onUpravaLog && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                Přehled ručních zásahů ředitele závodu v aktuální kategorii (penalizace, posuny pořadí).
              </p>
              <Btn variant="bezel" onClick={onUpravaLog} style={{ marginBottom: 14 }}>
                Zásahy ředitele…
              </Btn>
            </>
          )}
          {onHotkeys && (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                Přepínání fází i Rošt/Výsledky, uložení PDF, stopky a další — ať operátor u trati nehoní
                myš. Modifikátor se přizpůsobí systému (⌘ na macOS, Ctrl na Windows).
              </p>
              <Btn variant="bezel" icon="keyboard" onClick={onHotkeys}>
                Klávesové zkratky…
              </Btn>
            </>
          )}
        </>
      )}

      <Separator className="my-[18px]" />

      {/* ---- Sportity ---- */}
      <SekceNadpis>Sportity</SekceNadpis>
      <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
        Publikování PDF výsledků přímo do aplikace Sportity (live výsledky pro diváky).
      </p>
      {zavodId && zavod ? (
        <Btn variant="bezel" onClick={() => setUkazSportity(true)}>
          Nastavit Sportity…
        </Btn>
      ) : (
        <span style={{ fontSize: 12.5, color: 'var(--text-4)' }}>Nejprve otevřete závod.</span>
      )}

      <Separator className="my-[18px]" />

      {/* ---- O aplikaci ---- */}
      <SekceNadpis>O aplikaci</SekceNadpis>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 12px',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          background: 'var(--surface-secondary)'
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
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--foreground)' }}>
            {APP_NAME}{' '}
            <span className="tnum" style={{ color: 'var(--muted)', fontWeight: 500 }}>
              {APP_VERSION_LABEL}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Správce závodu autokros / rallycross · © {new Date().getFullYear()}
          </div>
        </div>
        <span
          className="tnum"
          style={{ fontSize: 11.5, color: 'var(--text-4)' }}
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
      />
    )}

    {ukazSportity && zavodId != null && zavod != null && (
      <SportityModal
        zavodId={zavodId}
        zavod={zavod}
        kategorie={kategorie}
        onClose={() => setUkazSportity(false)}
      />
    )}
  </>
  )
}

function SekceNadpis({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h3
      style={{
        margin: '0 0 10px',
        fontSize: 13.5,
        fontWeight: 620,
        color: 'var(--foreground)'
      }}
    >
      {children}
    </h3>
  )
}

const maleLink: React.CSSProperties = {
  height: 22,
  padding: '0 8px',
  fontSize: 12,
  color: 'var(--accent)',
  fontWeight: 530,
  borderRadius: 6
}
