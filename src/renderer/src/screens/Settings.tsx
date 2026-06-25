import { useEffect, useMemo, useState } from 'react'
import type { AppDiagnostics, Kategorie, PdfRootStav, Zavod } from '@shared/types'
import { Button } from '@heroui/react'
import { ArrowDownToSquare, FileLetterP, Keyboard, Pencil, TrashBin } from '@gravity-ui/icons'
import { Btn } from '../components/ui'
import { TiskovyPresetModal } from '../components/TiskovyPresetModal'
import { SportityModal } from '../components/SportityModal'
import { APP_NAME, APP_VERSION, APP_VERSION_LABEL } from '../lib/version'
import { safeCall } from '../lib/api'

const T3 = 'color-mix(in srgb, var(--color-foreground) 35%, transparent)'
const DIVIDER = 'var(--color-border)'

type SettingsSectionId = 'zavod' | 'pdf' | 'zalohy' | 'sportity' | 'nastroje' | 'aplikace'

interface SettingsSection {
  id: SettingsSectionId
  label: string
  description: string
}

interface SettingsProps {
  kategorie: Kategorie[]
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
  const [diagnostics, setDiagnostics] = useState<AppDiagnostics | null>(null)
  const [sekce, setSekce] = useState<SettingsSectionId>(() => onEditZavod ? 'zavod' : 'pdf')

  const sections = useMemo<SettingsSection[]>(() => {
    const list: SettingsSection[] = []
    if (onEditZavod) {
      list.push({
        id: 'zavod',
        label: 'Závod',
        description: 'Název, datum, místo a kategorie'
      })
    }
    list.push(
      {
        id: 'pdf',
        label: 'PDF a tisk',
        description: 'Logo, složka, hromadný export'
      },
      {
        id: 'zalohy',
        label: 'Zálohy',
        description: 'Export a obnova dat závodu'
      },
      {
        id: 'sportity',
        label: 'Sportity',
        description: 'Publikování výsledků pro diváky'
      }
    )
    if (onHotkeys || onUpravaLog) {
      list.push({
        id: 'nastroje',
        label: 'Nástroje',
        description: 'Zkratky a ruční zásahy'
      })
    }
    list.push({
      id: 'aplikace',
      label: 'O aplikaci',
      description: 'Verze, runtime a diagnostika'
    })
    return list
  }, [onEditZavod, onHotkeys, onUpravaLog])

  useEffect(() => {
    safeCall(window.api.getLogo().then(setLogo), onToast)
    safeCall(window.api.getPdfRootStav().then(setRoot), onToast)
    safeCall(window.api.getDiagnostics().then(setDiagnostics), onToast)
  }, [])

  useEffect(() => {
    if (!sections.some((s) => s.id === sekce)) {
      setSekce(sections[0]?.id ?? 'pdf')
    }
  }, [sections, sekce])

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
      onToast('Logo nahráno. Objeví se v hlavičce PDF.')
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

  const vse = kategorie.length > 0 && vybrane.size === kategorie.length
  const prepniVse = (): void =>
    setVybrane(vse ? new Set() : new Set(kategorie.map((k) => k.id)))

  const exportuj = async (): Promise<void> => {
    if (vybrane.size === 0 || probiha) return
    setProbiha(true)
    try {
      const res = await window.api.exportPdfVse([...vybrane])
      if (res.ok) onToast(`Hotovo. ${res.pocet} PDF uloženo do: ${res.slozka}`)
      else if (!res.zruseno) onToast(res.chyba ?? 'Hromadný export se nezdařil.')
    } finally {
      setProbiha(false)
    }
  }

  const kopirovatDiagnostiku = async (): Promise<void> => {
    const data = diagnostics ?? await window.api.getDiagnostics()
    setDiagnostics(data)
    const text = formatDiagnostics(data)
    await writeClipboard(text)
    onToast('Diagnostika zkopírována do schránky.')
  }

  return (
    <>
      <section className="settings-page" aria-labelledby="settings-title">
        <header className="settings-page__header">
          <div>
            <h1 id="settings-title">Nastavení</h1>
            <p>
              Správa závodu, PDF výstupů, záloh a podpůrných nástrojů pro aktuální
              pracovní okno.
            </p>
          </div>
        </header>

        <div className="settings-page__body">
          <nav className="settings-nav" aria-label="Sekce nastavení">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                className="settings-nav__item"
                data-active={item.id === sekce ? 'true' : undefined}
                aria-current={item.id === sekce ? 'page' : undefined}
                onClick={() => setSekce(item.id)}
              >
                <span className="settings-nav__label">{item.label}</span>
                <span className="settings-nav__description">{item.description}</span>
              </button>
            ))}
          </nav>

          <div className="settings-detail">
            {sekce === 'zavod' && onEditZavod && (
              <SettingsSectionShell
                id="settings-section-zavod"
                title="Závod a kategorie"
                description="Úprava základních údajů závodu a seznamu kategorií."
              >
                <SettingsGroup>
                  <p className="settings-copy">
                    Tady se mění název, datum, místo závodu a seznam kategorií. Po uložení se
                    obnoví levý seznam kategorií i titulky otevřeného závodu.
                  </p>
                  <div className="settings-action-row">
                    <Btn variant="bezel" icon={<Pencil />} onClick={onEditZavod}>
                      Upravit závod…
                    </Btn>
                  </div>
                </SettingsGroup>
              </SettingsSectionShell>
            )}

            {sekce === 'pdf' && (
              <SettingsSectionShell
                id="settings-section-pdf"
                title="PDF a tisk"
                description="Logo, výchozí složka PDF, závodní tisk a hromadný export."
              >
                <SettingsGroup title="Logo do hlavičky PDF">
                  <div className="settings-logo-row">
                    <div className="settings-logo-preview">
                      {logo ? (
                        <img src={logo} alt="Logo v PDF" />
                      ) : (
                        <span>žádné logo</span>
                      )}
                    </div>
                    <div className="settings-logo-controls">
                      <div className="settings-action-row">
                        <Btn variant="bezel" icon={<ArrowDownToSquare />} onClick={() => void nahrat()}>
                          {logo ? 'Změnit logo…' : 'Nahrát logo…'}
                        </Btn>
                        {logo && (
                          <Btn variant="plain" icon={<TrashBin />} onClick={() => void odebrat()}>
                            Odebrat
                          </Btn>
                        )}
                      </div>
                      <p className="settings-help">
                        PNG nebo JPG. Logo se zobrazí vlevo v hlavičce všech PDF; bez loga zůstane
                        místo prázdné.
                      </p>
                    </div>
                  </div>
                </SettingsGroup>

                <SettingsGroup title="Složka pro PDF">
                  <div className="settings-path-row">
                    <span
                      className="settings-path-row__value"
                      data-empty={!root?.root ? 'true' : undefined}
                      title={root?.root ?? ''}
                    >
                      {root?.root ?? 'zatím nenastaveno'}
                      {root?.root && !root.existuje && (
                        <span className="settings-danger-text"> — složka neexistuje</span>
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
                  <p className="settings-help">
                    PDF se ukládají do struktury <b>závod / kategorie</b>. Tlačítko Uložit PDF
                    ukládá bez ptaní; volba Uložit jako umožní jednorázovou výjimku.
                  </p>
                </SettingsGroup>

                <SettingsGroup title="Závodní tisk">
                  <p className="settings-copy">
                    Rychlý tisk standardní sady listů na výchozí tiskárnu: startovka 1x,
                    rošty Q1-Q3 a finále 4x, výsledky finále 1x.
                  </p>
                  <div className="settings-action-row">
                    <Btn variant="bezel" icon={<FileLetterP />} onClick={() => setUkazPreset(true)}>
                      Závodní tisk…
                    </Btn>
                  </div>
                </SettingsGroup>

                <SettingsGroup title="Hromadný export do PDF">
                  <p className="settings-copy">
                    Vygeneruje všechny listy vybraných kategorií do struktury pod kořenovou
                    složkou.
                  </p>

                  <div className="settings-category-toolbar">
                    <span>Kategorie ({vybrane.size})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      isDisabled={kategorie.length === 0}
                      onPress={prepniVse}
                    >
                      {vse ? 'Zrušit výběr' : 'Vybrat vše'}
                    </Button>
                  </div>

                  <div className="settings-category-list">
                    {kategorie.length === 0 ? (
                      <div className="settings-empty">Závod zatím nemá žádné kategorie.</div>
                    ) : (
                      kategorie.map((k, i) => (
                        <label
                          key={k.id}
                          className="settings-category-row"
                          style={{ borderTop: i === 0 ? 'none' : `0.5px solid ${DIVIDER}` }}
                        >
                          <input
                            type="checkbox"
                            checked={vybrane.has(k.id)}
                            onChange={() => prepni(k.id)}
                          />
                          <span className="settings-category-row__name">{k.nazev}</span>
                          <span className="settings-category-row__count">{k.pocet} jezdců</span>
                        </label>
                      ))
                    )}
                  </div>

                  <div className="settings-action-row settings-action-row--end">
                    <Btn
                      variant="primary"
                      icon={<FileLetterP />}
                      onClick={() => void exportuj()}
                      disabled={probiha || vybrane.size === 0}
                    >
                      {probiha ? 'Exportuji…' : 'Exportovat vše'}
                    </Btn>
                  </div>
                </SettingsGroup>
              </SettingsSectionShell>
            )}

            {sekce === 'zalohy' && (
              <SettingsSectionShell
                id="settings-section-zalohy"
                title="Zálohy"
                description="Export aktuálního závodu, všech závodů a obnova ze souboru."
              >
                <SettingsGroup>
                  <p className="settings-copy">
                    Záloha obsahuje kompletní data závodu: rošty, výsledky, stopky,
                    penalizace i související nastavení. Obnova je potvrzovaná samostatným
                    dialogem.
                  </p>
                  <div className="settings-action-row">
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
                </SettingsGroup>
              </SettingsSectionShell>
            )}

            {sekce === 'sportity' && (
              <SettingsSectionShell
                id="settings-section-sportity"
                title="Sportity"
                description="Publikování PDF výsledků do divácké aplikace."
              >
                <SettingsGroup>
                  <p className="settings-copy">
                    Nastavení propojení pro odesílání výsledkových PDF do Sportity.
                    Výsledky se publikují pro právě otevřený závod.
                  </p>
                  {zavodId && zavod ? (
                    <div className="settings-action-row">
                      <Btn variant="bezel" onClick={() => setUkazSportity(true)}>
                        Nastavit Sportity…
                      </Btn>
                    </div>
                  ) : (
                    <span className="settings-muted">Nejprve otevři závod.</span>
                  )}
                </SettingsGroup>
              </SettingsSectionShell>
            )}

            {sekce === 'nastroje' && (onHotkeys || onUpravaLog) && (
              <SettingsSectionShell
                id="settings-section-nastroje"
                title="Nástroje"
                description="Pomocné přehledy a klávesové ovládání."
              >
                {onUpravaLog && (
                  <SettingsGroup title="Zásahy ředitele">
                    <p className="settings-copy">
                      Přehled ručních zásahů v aktuální kategorii, včetně penalizací
                      a posunů pořadí.
                    </p>
                    <div className="settings-action-row">
                      <Btn variant="bezel" onClick={onUpravaLog}>
                        Zásahy ředitele…
                      </Btn>
                    </div>
                  </SettingsGroup>
                )}

                {onHotkeys && (
                  <SettingsGroup title="Klávesové zkratky">
                    <p className="settings-copy">
                      Přepínání fází, Rošt/Výsledky, uložení PDF, stopky a další
                      zkratky pro práci bez myši.
                    </p>
                    <div className="settings-action-row">
                      <Btn variant="bezel" icon={<Keyboard />} onClick={onHotkeys}>
                        Klávesové zkratky…
                      </Btn>
                    </div>
                  </SettingsGroup>
                )}
              </SettingsSectionShell>
            )}

            {sekce === 'aplikace' && (
              <SettingsSectionShell
                id="settings-section-aplikace"
                title="O aplikaci"
                description="Verze aplikace, build metadata a diagnostika pro podporu."
              >
                <div className="settings-about">
                  <span className="settings-app-mark">V</span>
                  <div className="settings-about__title">
                    <div>
                      {APP_NAME}{' '}
                      <span className="tnum" style={{ color: T3, fontWeight: 500 }}>
                        {APP_VERSION_LABEL}
                      </span>
                    </div>
                    <span>Správce závodu autokros / rallycross · © {new Date().getFullYear()}</span>
                  </div>
                  <div className="settings-info-grid">
                    <InfoRadek label="Kanál" value={diagnostics?.build.releaseChannel ?? '...'} />
                    <InfoRadek label="Build" value={APP_VERSION} mono />
                    <InfoRadek label="Commit" value={diagnostics?.build.shortCommitSha ?? '...'} mono />
                    <InfoRadek label="Git ref" value={diagnostics?.build.gitRef ?? '...'} mono />
                    <InfoRadek label="Build date" value={formatDate(diagnostics?.build.buildDate)} mono />
                    <InfoRadek
                      label="Runtime"
                      value={
                        diagnostics
                          ? `${diagnostics.runtime.platform}/${diagnostics.runtime.arch} · Electron ${diagnostics.runtime.electron}`
                          : '...'
                      }
                    />
                    <InfoRadek
                      label="DB schema"
                      value={
                        diagnostics
                          ? `${diagnostics.database.userVersion ?? '?'} / ${diagnostics.database.schemaVersion}`
                          : '...'
                      }
                      mono
                    />
                    <InfoRadek
                      label="Data"
                      value={diagnostics?.paths.userData ?? '...'}
                      mono
                      title={diagnostics?.paths.userData}
                    />
                  </div>
                  <div className="settings-action-row settings-action-row--end">
                    <Btn variant="bezel" onClick={() => void kopirovatDiagnostiku()}>
                      Kopírovat diagnostiku
                    </Btn>
                  </div>
                </div>
              </SettingsSectionShell>
            )}
          </div>
        </div>
      </section>

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

function SettingsSectionShell({
  id,
  title,
  description,
  children
}: {
  id: string
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <article className="settings-section" aria-labelledby={id}>
      <header className="settings-section__header">
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </article>
  )
}

function SettingsGroup({
  title,
  children
}: {
  title?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="settings-group">
      {title && <h3>{title}</h3>}
      {children}
    </section>
  )
}

function InfoRadek({
  label,
  value,
  mono,
  title
}: {
  label: string
  value: string
  mono?: boolean
  title?: string
}): React.JSX.Element {
  return (
    <div className="settings-info-row">
      <div className="settings-info-row__label">{label}</div>
      <div
        className={mono ? 'settings-info-row__value tnum' : 'settings-info-row__value'}
        title={title ?? value}
        style={{ fontFamily: mono ? 'ui-monospace, SFMono-Regular, Consolas, monospace' : undefined }}
      >
        {value}
      </div>
    </div>
  )
}

function formatDate(value: string | undefined): string {
  if (!value || value === 'unknown') return 'local'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('cs-CZ')
}

function formatDiagnostics(d: AppDiagnostics): string {
  const lines = [
    `${d.build.productName} ${APP_VERSION_LABEL}`,
    '',
    `Version: ${d.build.version}`,
    `Release channel: ${d.build.releaseChannel}`,
    `Commit: ${d.build.commitSha}`,
    `Git ref: ${d.build.gitRef}`,
    `Build date: ${d.build.buildDate}`,
    `Packaged by: ${d.build.packagedBy}`,
    '',
    `Platform: ${d.runtime.platform}/${d.runtime.arch}`,
    `Electron: ${d.runtime.electron}`,
    `Node: ${d.runtime.node}`,
    `Chrome: ${d.runtime.chrome}`,
    `V8: ${d.runtime.v8}`,
    `Packaged app: ${d.runtime.appPackaged ? 'yes' : 'no'}`,
    '',
    `DB schema: ${d.database.userVersion ?? '?'} / ${d.database.schemaVersion}`,
    `User data: ${d.paths.userData}`,
    `Database: ${d.paths.database}`,
    `Startup log: ${d.paths.startupLog}`,
    '',
    `Client time: ${new Date().toISOString()}`,
    `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    `User agent: ${navigator.userAgent}`
  ]
  return lines.join('\n')
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
  } finally {
    textarea.remove()
  }
}
