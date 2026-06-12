import { useEffect, useRef, useState } from 'react'
import type { Kategorie, RaceType, SportityEventView, SportityNodeView, Zavod } from '@shared/types'
import { Button, Chip, Input, Label, ListBox, Modal, Tag, TagGroup, TextField } from '@heroui/react'
import { Flag, Plus } from '@gravity-ui/icons'
import { VYCHOZI_KATEGORIE } from '../data/raceDefaults'
import { safeCall } from '../lib/api'

function dnesISO(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function chipsProTyp(typ: RaceType): string[] {
  if (typ === 'RX') return VYCHOZI_KATEGORIE.RX
  return [...VYCHOZI_KATEGORIE.RAC, 'Šotolina']
}

function sjednotDostupne(typ: RaceType, nazvyZKategorie: string[]): string[] {
  const chips = chipsProTyp(typ)
  const extra = nazvyZKategorie.filter((n) => !chips.includes(n))
  return [...chips, ...extra]
}

interface RaceDialogProps {
  mode: 'new' | 'edit'
  zavod?: Zavod
  onCancel: () => void
  onSaved: (z: Zavod) => void
}

export function RaceDialog({ mode, zavod, onCancel, onSaved }: RaceDialogProps): React.JSX.Element {
  const [nazev, setNazev] = useState(zavod?.nazev ?? '')
  const [datum, setDatum] = useState(zavod?.datum ?? dnesISO())
  const [misto, setMisto] = useState(zavod?.misto ?? '')
  const [typ, setTyp] = useState<RaceType>(zavod?.typ ?? 'RAC')
  const [dostupne, setDostupne] = useState<string[]>(() => chipsProTyp(zavod?.typ ?? 'RAC'))
  const [vybrane, setVybrane] = useState<Set<string>>(
    () => new Set(VYCHOZI_KATEGORIE[zavod?.typ ?? 'RAC'])
  )
  const [existujici, setExistujici] = useState<Kategorie[]>([])
  const [vlastni, setVlastni] = useState('')
  const [uklada, setUklada] = useState(false)
  const [nacita, setNacita] = useState(mode === 'edit')
  const [confirmOdebrani, setConfirmOdebrani] = useState<string | null>(null)

  const [sportityDostupne, setSportityDostupne] = useState(false)
  const sportityChecked = useRef(false)
  const [sportityHeslo, setSportityHeslo] = useState('')
  const [sportityEvents, setSportityEvents] = useState<SportityEventView[]>([])
  const [sportityLoadingEvents, setSportityLoadingEvents] = useState(false)
  const [sportityEventId, setSportityEventId] = useState('')
  const [sportityFolders, setSportityFolders] = useState<SportityNodeView[]>([])
  const [sportityLoadingFolders, setSportityLoadingFolders] = useState(false)
  const [sportityFolderId, setSportityFolderId] = useState('')
  const [sportityFolderName, setSportityFolderName] = useState('')

  useEffect(() => {
    if (mode !== 'new' || sportityChecked.current) return
    sportityChecked.current = true
    safeCall(
      window.api.getSportitySettings().then(async (s) => {
        if (!s.apiKeySet) return
        const res = await window.api.testSportityConnection()
        if (res.ok) setSportityDostupne(true)
      })
    )
  }, [mode])

  useEffect(() => {
    if (mode !== 'edit' || !zavod) return
    let live = true
    setNacita(true)
    safeCall(
      window.api.listKategorie(zavod.id).then((cats) => {
        if (!live) return
        setExistujici(cats)
        setDostupne(sjednotDostupne(zavod.typ, cats.map((c) => c.nazev)))
        setVybrane(new Set(cats.map((c) => c.nazev)))
        setNacita(false)
      })
    )
    return () => {
      live = false
    }
  }, [mode, zavod?.id, zavod?.typ])

  const zmenTyp = (t: RaceType): void => {
    setTyp(t)
    setDostupne(chipsProTyp(t))
    setVybrane(new Set(VYCHOZI_KATEGORIE[t]))
    setVlastni('')
  }

  const pridejVlastni = (): void => {
    const n = vlastni.trim()
    if (!n) return
    setDostupne((prev) => (prev.includes(n) ? prev : [...prev, n]))
    setVybrane((prev) => new Set(prev).add(n))
    setVlastni('')
  }

  const nactiSportityEvents = async (): Promise<void> => {
    setSportityLoadingEvents(true)
    setSportityEvents([])
    setSportityEventId('')
    setSportityFolders([])
    setSportityFolderId('')
    try {
      const evs = await window.api.sportityListEvents()
      setSportityEvents(evs)
    } finally {
      setSportityLoadingEvents(false)
    }
  }

  const nactiSportityFolders = async (eventId: string): Promise<void> => {
    if (!sportityHeslo.trim()) return
    setSportityLoadingFolders(true)
    setSportityFolders([])
    setSportityFolderId('')
    try {
      const docs = await window.api.sportityListDocuments(sportityHeslo.trim(), eventId || null)
      setSportityFolders(docs.filter((d) => d.type === 'Folder'))
    } finally {
      setSportityLoadingFolders(false)
    }
  }

  const vybraneNazvy = dostupne.filter((n) => vybrane.has(n))
  const muzeUlozit = nazev.trim() !== '' && datum !== '' && vybraneNazvy.length > 0 && !nacita

  const ulozSkutecne = async (): Promise<void> => {
    setConfirmOdebrani(null)
    setUklada(true)
    try {
      const kategorie = vybraneNazvy.map((n) => ({ nazev: n, ruleset: 'STANDARD' as const }))
      if (mode === 'edit' && zavod) {
        const z = await window.api.updateZavod({ id: zavod.id, nazev, datum, misto, kategorie })
        onSaved(z)
      } else {
        const z = await window.api.createZavod({ nazev, datum, misto, typ, kategorie })
        if (sportityDostupne && sportityHeslo.trim() && sportityFolderId) {
          await window.api.saveSportityZavodMap(
            z.id,
            sportityHeslo.trim(),
            sportityEventId || null,
            sportityFolderId,
            sportityFolderName
          )
        }
        onSaved(z)
      }
    } finally {
      setUklada(false)
    }
  }

  const uloz = (): void => {
    if (!muzeUlozit || uklada) return
    if (mode === 'edit' && zavod) {
      const jeVybrana = (katNazev: string): boolean =>
        vybraneNazvy.some((v) => v.toLocaleLowerCase('cs') === katNazev.toLocaleLowerCase('cs'))
      const sDaty = existujici
        .filter((k) => !jeVybrana(k.nazev))
        .filter((k) => k.pocet > 0)
      if (sDaty.length > 0) {
        setConfirmOdebrani(sDaty.map((k) => `${k.nazev} (${k.pocet} jezdců)`).join(', '))
        return
      }
    }
    void ulozSkutecne()
  }

  const kategorieSekce = (
    <div className="mb-3">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-muted">
          Kategorie <span className="font-normal">({vybraneNazvy.length} vybráno)</span>
        </span>
        <span className="text-xs text-muted">klikni pro výběr</span>
      </div>

      {nacita ? (
        <p className="mb-3 text-sm text-muted">Načítám kategorie…</p>
      ) : (
        <TagGroup
          selectionMode="multiple"
          selectedKeys={vybrane}
          onSelectionChange={(keys) => {
            if (keys === 'all') return
            setVybrane(new Set(Array.from(keys).map(String)))
          }}
        >
          <TagGroup.List className="flex flex-wrap gap-2">
            {dostupne.map((n) => {
              const kat = existujici.find((k) => k.nazev === n)
              return (
                <Tag
                  key={n}
                  id={n}
                  title={
                    kat && kat.pocet > 0
                      ? `${kat.pocet} jezdců — odebráním smažeš kategorii`
                      : undefined
                  }
                >
                  {n}
                  {kat && kat.pocet > 0 && (
                    <span className="ml-1.5 text-[11px] opacity-60">{kat.pocet}</span>
                  )}
                </Tag>
              )
            })}
          </TagGroup.List>
        </TagGroup>
      )}

      <div className="mt-3 flex gap-2">
        <TextField className="flex-1">
          <Input
            value={vlastni}
            onChange={(e) => setVlastni(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                pridejVlastni()
              }
            }}
            placeholder="přidat vlastní kategorii…"
            isDisabled={nacita}
          />
        </TextField>
        <Button
          size="sm"
          variant="secondary"
          onPress={pridejVlastni}
          isDisabled={vlastni.trim() === '' || nacita}
        >
          <Plus width={13} height={13} />
          Přidat
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Modal>
        <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onCancel() }}>
          <Modal.Container>
            <Modal.Dialog className="w-[560px] max-w-[calc(100vw-2rem)]">
              <Modal.Header>
                <span className="text-base font-semibold">
                  {mode === 'edit' ? 'Upravit závod' : 'Nový závod'}
                </span>
              </Modal.Header>

              <Modal.Body>
                <TextField className="mb-3">
                  <Label>Název závodu</Label>
                  <Input
                    value={nazev}
                    onChange={(e) => setNazev(e.target.value)}
                    placeholder="např. MČR Autocross — Přerov"
                    autoFocus
                  />
                </TextField>

                <div className="mb-3 flex gap-3">
                  <TextField className="flex-1">
                    <Label>Datum</Label>
                    <Input
                      type="date"
                      value={datum}
                      onChange={(e) => setDatum(e.target.value)}
                    />
                  </TextField>
                  <TextField className="flex-1">
                    <Label>Místo (nepovinné)</Label>
                    <Input
                      value={misto}
                      onChange={(e) => setMisto(e.target.value)}
                      placeholder="např. Přerov"
                    />
                  </TextField>
                </div>

                {mode === 'new' ? (
                  <>
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-semibold text-muted">Typ závodu</p>
                      <div className="flex w-fit gap-1 rounded-lg border border-border p-0.5">
                        {(['RAC', 'RX'] as RaceType[]).map((t) => (
                          <Button
                            key={t}
                            size="sm"
                            variant={typ === t ? 'default' : 'ghost'}
                            onPress={() => zmenTyp(t)}
                          >
                            {t === 'RAC' ? (
                              'RAC Race'
                            ) : (
                              <span className="flex items-center gap-1.5">
                                RX Cup
                                <Chip size="sm" variant="soft" color="warning">
                                  Ve vývoji
                                </Chip>
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {kategorieSekce}

                    {sportityDostupne && (
                      <SportitySekce
                        heslo={sportityHeslo}
                        onHeslo={setSportityHeslo}
                        events={sportityEvents}
                        loadingEvents={sportityLoadingEvents}
                        onNactiEvents={() => void nactiSportityEvents()}
                        eventId={sportityEventId}
                        onEventId={(id) => {
                          setSportityEventId(id)
                          setSportityFolders([])
                          setSportityFolderId('')
                          if (id) void nactiSportityFolders(id)
                        }}
                        folders={sportityFolders}
                        loadingFolders={sportityLoadingFolders}
                        folderId={sportityFolderId}
                        onFolderId={(id, name) => {
                          setSportityFolderId(id)
                          setSportityFolderName(name)
                        }}
                      />
                    )}

                    {typ === 'RX' && (
                      <p className="mb-2.5 rounded-lg bg-warning/10 px-2.5 py-2 text-[11.5px] leading-relaxed">
                        <b>RX Cup je ve vývoji</b> — bodování do seriálu zatím není finální. Závod
                        můžeš normálně založit a zkoušet.
                      </p>
                    )}

                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                      Nabídka je dle typu závodu — klikni na kategorie, které chceš.{' '}
                      {typ !== 'RAC' && (
                        <>
                          <b>RX Cup</b> nemá kategorii Šotolina.{' '}
                        </>
                      )}
                      Vlastní kategorii přidáš polem výše.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-semibold text-muted">Typ závodu</p>
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant="soft">
                          {typ === 'RAC' ? 'RAC Race' : 'RX Cup'}
                        </Chip>
                        {typ === 'RX' && (
                          <Chip size="sm" variant="soft" color="warning">
                            Ve vývoji
                          </Chip>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                        Typ závodu nelze po založení změnit. Kategorie můžeš přidat nebo odebrat
                        (odebrání smaže i data kategorie).
                      </p>
                    </div>

                    {kategorieSekce}

                    <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                      {typ === 'RAC' ? (
                        <>
                          U RAC můžeš přidat <b>Šotolinu</b> nebo vlastní název. Číslo u chipu =
                          počet jezdců v kategorii.
                        </>
                      ) : (
                        <>U RX Cup nelze přidat kategorii Šotolina (jiné pravidlo než RAC).</>
                      )}
                    </p>
                  </>
                )}
              </Modal.Body>

              <Modal.Footer className="flex justify-end gap-2">
                <Button variant="secondary" onPress={onCancel}>
                  Zrušit
                </Button>
                <Button onPress={uloz} isDisabled={!muzeUlozit || uklada}>
                  <Flag width={14} height={14} />
                  {mode === 'edit' ? 'Uložit' : 'Založit závod'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {confirmOdebrani && (
        <Modal>
          <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) setConfirmOdebrani(null) }}>
            <Modal.Container>
              <Modal.Dialog className="w-[460px] max-w-[calc(100vw-2rem)]">
                <Modal.Header>
                  <span className="text-base font-semibold">Odebrat kategorie s daty?</span>
                </Modal.Header>
                <Modal.Body>
                  <p className="mb-2.5 text-[13.5px] leading-relaxed">
                    Odebereš kategorie: <b>{confirmOdebrani}</b>.
                  </p>
                  <p className="text-[13px] leading-relaxed text-muted">
                    Smažou se včetně startovek, roštů, výsledků a PDF dat v databázi. Tuto akci
                    nelze vrátit.
                  </p>
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="secondary" onPress={() => setConfirmOdebrani(null)}>
                    Zrušit
                  </Button>
                  <Button variant="danger" onPress={() => void ulozSkutecne()}>
                    Odebrat a uložit
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}
    </>
  )
}

function SportitySekce({
  heslo,
  onHeslo,
  events,
  loadingEvents,
  onNactiEvents,
  eventId,
  onEventId,
  folders,
  loadingFolders,
  folderId,
  onFolderId
}: {
  heslo: string
  onHeslo: (v: string) => void
  events: SportityEventView[]
  loadingEvents: boolean
  onNactiEvents: () => void
  eventId: string
  onEventId: (id: string) => void
  folders: SportityNodeView[]
  loadingFolders: boolean
  folderId: string
  onFolderId: (id: string, name: string) => void
}): React.JSX.Element {
  return (
    <div className="mb-3 rounded-lg border border-border p-3">
      <p className="mb-2.5 text-xs font-semibold text-muted">Sportity</p>

      <div className="mb-2.5 flex gap-2">
        <TextField className="flex-1">
          <Input
            value={heslo}
            onChange={(e) => onHeslo(e.target.value)}
            placeholder="Heslo kanálu"
          />
        </TextField>
        <Button
          size="sm"
          variant="secondary"
          onPress={onNactiEvents}
          isDisabled={!heslo.trim() || loadingEvents}
        >
          {loadingEvents ? 'Načítám…' : 'Načíst'}
        </Button>
      </div>

      {events.length > 0 && (
        <div className="mb-2.5">
          <PickerList
            items={events.map((e) => ({ id: e.id, label: e.name }))}
            value={eventId}
            onChange={onEventId}
            placeholder="— bez eventu —"
          />
        </div>
      )}

      {loadingFolders && (
        <p className="mb-2.5 text-[12.5px] text-muted">Načítám složky…</p>
      )}

      {folders.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-muted">Složka s výsledky:</p>
          <PickerList
            items={folders.map((f) => ({ id: f.id, label: f.name }))}
            value={folderId}
            onChange={(id) => {
              const f = folders.find((x) => x.id === id)
              onFolderId(id, f?.name ?? '')
            }}
          />
        </div>
      )}

      {folderId && (
        <p className="mt-2 text-[11.5px] text-muted">
          Sportity mapování se uloží automaticky po vytvoření závodu.
        </p>
      )}
    </div>
  )
}

function PickerList({
  items,
  value,
  onChange,
  placeholder
}: {
  items: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}): React.JSX.Element {
  const allItems = placeholder ? [{ id: '', label: placeholder }, ...items] : items
  return (
    <ListBox
      selectionMode="single"
      selectedKeys={value !== '' ? new Set([value]) : new Set()}
      onSelectionChange={(keys) => {
        if (keys === 'all') return
        const arr = Array.from(keys).map(String)
        onChange(arr[0] ?? '')
      }}
      className="max-h-[140px] overflow-y-auto rounded-lg border border-border"
    >
      {allItems.map((item) => (
        <ListBox.Item
          key={item.id !== '' ? item.id : '__placeholder__'}
          id={item.id}
          textValue={item.label}
        >
          {item.label}
        </ListBox.Item>
      ))}
    </ListBox>
  )
}
