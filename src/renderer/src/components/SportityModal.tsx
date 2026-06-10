import { useEffect, useState } from 'react'
import { Input, Separator, toast } from '@heroui/react'
import type {
  Kategorie,
  SportityEventView,
  SportityKategorieMapView,
  SportityNodeView,
  SportityPublishResult,
  SportityZavodMapView,
  Zavod
} from '@shared/types'
import { Modal } from './Modal'
import { Btn } from './ui'
import { safeCall } from '../lib/api'

interface SportityModalProps {
  zavodId: number
  zavod: Zavod
  kategorie: Kategorie[]
  onClose: () => void
}

export function SportityModal({
  zavodId,
  zavod,
  kategorie,
  onClose
}: SportityModalProps): React.JSX.Element {
  // API key section
  const [apiKeySet, setApiKeySet] = useState(false)
  const [apiKeyHint, setApiKeyHint] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [savingKey, setSavingKey] = useState(false)

  // Channel/event selection
  const [events, setEvents] = useState<SportityEventView[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedPassword, setSelectedPassword] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string>('')

  // Folder selection
  const [folders, setFolders] = useState<SportityNodeView[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [selectedFolderId, setSelectedFolderId] = useState('')

  // Zavod map
  const [zavodMap, setZavodMap] = useState<SportityZavodMapView | null>(null)
  const [savingZavodMap, setSavingZavodMap] = useState(false)

  // Category maps
  const [katMaps, setKatMaps] = useState<SportityKategorieMapView[]>([])
  const [autoMapping, setAutoMapping] = useState(false)

  // Publish
  const [publishing, setPublishing] = useState<Record<number, boolean>>({})
  const [publishResults, setPublishResults] = useState<Record<number, SportityPublishResult>>({})

  // Log
  const [log, setLog] = useState<Array<{ id: number; kategorieNazev: string | null; listKey: string | null; action: string; status: string; message: string | null; createdAt: string }>>([])

  useEffect(() => {
    loadSettings()
    loadZavodMap()
  }, [])

  const loadSettings = (): void => {
    safeCall(
      window.api.getSportitySettings().then((s) => {
        setApiKeySet(s.apiKeySet)
        setApiKeyHint(s.apiKeyHint)
      }),
      (msg) => toast.danger(msg)
    )
  }

  const loadZavodMap = (): void => {
    safeCall(
      window.api.getSportityZavodMap(zavodId).then((m) => {
        setZavodMap(m)
        if (m) {
          setSelectedPassword(m.channelPassword)
          setSelectedEventId(m.eventId ?? '')
          setSelectedFolderId(m.resultsFolderId)
          loadKatMaps()
          loadLog()
        }
      }),
      (msg) => toast.danger(msg)
    )
  }

  const loadKatMaps = (): void => {
    safeCall(
      window.api.getSportityKategorieMap(zavodId).then(setKatMaps),
      (msg) => toast.danger(msg)
    )
  }

  const loadLog = (): void => {
    safeCall(
      window.api.getSportityPublishLog(zavodId).then((entries) => setLog(entries.slice(0, 20))),
      (msg) => toast.danger(msg)
    )
  }

  const saveApiKey = async (): Promise<void> => {
    if (!apiKeyInput.trim()) return
    setSavingKey(true)
    try {
      await window.api.saveSportityApiKey(apiKeyInput.trim())
      setApiKeyInput('')
      setTestResult(null)
      loadSettings()
      toast.success('API klíč uložen.')
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : 'Chyba při ukládání klíče.')
    } finally {
      setSavingKey(false)
    }
  }

  const clearApiKey = async (): Promise<void> => {
    await window.api.clearSportityApiKey()
    setApiKeySet(false)
    setApiKeyHint(null)
    setTestResult(null)
    toast('API klíč odstraněn.')
  }

  const testConn = async (): Promise<void> => {
    const res = await window.api.testSportityConnection()
    setTestResult(res)
  }

  const loadEvents = async (): Promise<void> => {
    setLoadingEvents(true)
    try {
      const evs = await window.api.sportityListEvents()
      setEvents(evs)
      if (evs.length > 0 && !selectedPassword) {
        setSelectedPassword(evs[0].password)
        setSelectedEventId(evs[0].id)
      }
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : 'Chyba při načítání kanálů.')
    } finally {
      setLoadingEvents(false)
    }
  }

  const loadFolders = async (): Promise<void> => {
    if (!selectedPassword) return
    setLoadingFolders(true)
    try {
      const docs = await window.api.sportityListDocuments(selectedPassword, selectedEventId || null)
      setFolders(docs.filter((d) => d.type === 'Folder'))
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : 'Chyba při načítání složek.')
    } finally {
      setLoadingFolders(false)
    }
  }

  const saveZavodMap = async (): Promise<void> => {
    if (!selectedPassword || !selectedFolderId) return
    setSavingZavodMap(true)
    try {
      const folder = folders.find((f) => f.id === selectedFolderId)
      const ev = events.find((e) => e.id === selectedEventId)
      await window.api.saveSportityZavodMap(
        zavodId,
        selectedPassword,
        selectedEventId || null,
        selectedFolderId,
        folder?.name ?? selectedFolderId
      )
      loadZavodMap()
      toast.success(`Závod namapován na kanál ${ev?.name ?? selectedPassword}.`)
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : 'Chyba při ukládání mapování.')
    } finally {
      setSavingZavodMap(false)
    }
  }

  const autoMap = async (): Promise<void> => {
    setAutoMapping(true)
    try {
      const maps = await window.api.sportityAutoMapCategories(zavodId)
      setKatMaps(maps)
      const matched = maps.filter((m) => m.folderId).length
      toast.success(`Automaticky spárováno ${matched} z ${maps.length} kategorií.`)
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : 'Chyba při automatickém párování.')
    } finally {
      setAutoMapping(false)
    }
  }

  const clearKatMap = async (kategorieId: number): Promise<void> => {
    await window.api.clearSportityKategorieMap(kategorieId)
    loadKatMaps()
  }

  const publishCategory = async (kategorieId: number): Promise<void> => {
    setPublishing((p) => ({ ...p, [kategorieId]: true }))
    try {
      const res = await window.api.sportityPublishCategory(kategorieId)
      setPublishResults((p) => ({ ...p, [kategorieId]: res }))
      toast.success(`Publikováno: ${res.created} nových, ${res.updated} aktualizovaných.`)
      loadLog()
    } catch (e) {
      toast.danger(e instanceof Error ? e.message : 'Chyba při publikování.')
    } finally {
      setPublishing((p) => ({ ...p, [kategorieId]: false }))
    }
  }

  const mappedKat = kategorie.filter((k) => katMaps.find((m) => m.kategorieId === k.id && m.folderId))

  return (
    <Modal title="Sportity" width={600} onClose={onClose} footer={
      <Btn variant="plain" onClick={onClose}>Zavřít</Btn>
    }>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Section 1: API klíč */}
        <SekceNadpis>API klíč</SekceNadpis>
        <div style={{ marginBottom: 10, fontSize: 12.5, color: 'var(--muted)' }}>
          {apiKeySet
            ? <span>Nastaven: <b style={{ color: 'var(--foreground)', fontFamily: 'monospace' }}>{apiKeyHint}</b></span>
            : <span style={{ color: 'var(--muted)' }}>Klíč není nastaven.</span>
          }
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Input
            type="password"
            placeholder="Vložit nový API klíč…"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter') void saveApiKey() }}
          />
          <Btn variant="primary" onClick={() => void saveApiKey()} disabled={savingKey || !apiKeyInput.trim()}>
            {savingKey ? 'Ukládám…' : 'Uložit'}
          </Btn>
          {apiKeySet && (
            <>
              <Btn variant="plain" onClick={() => void clearApiKey()}>Smazat</Btn>
              <Btn variant="bezel" onClick={() => void testConn()}>Test spojení</Btn>
            </>
          )}
        </div>
        {testResult && (
          <Alert status={testResult.ok ? 'success' : 'danger'} className="mb-2">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{testResult.message}</Alert.Title>
            </Alert.Content>
          </Alert>
        )}

        <Hairline />

        {/* Section 2: Kanál a složka */}
        {apiKeySet && (
          <>
            <SekceNadpis>Kanál a složka výsledků</SekceNadpis>
            {zavodMap && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
                Aktuální: <b style={{ color: 'var(--foreground)' }}>{zavodMap.resultsFolderName}</b>
                {' '}(kanál: {zavodMap.channelPassword}{zavodMap.eventId ? `, event: ${zavodMap.eventId}` : ''})
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Btn variant="bezel" onClick={() => void loadEvents()} disabled={loadingEvents}>
                {loadingEvents ? 'Načítám…' : 'Načíst kanály'}
              </Btn>
            </div>
            {events.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Kanál:</div>
                <PickerList
                  items={events.map((ev) => ({ id: `${ev.password}|${ev.id}`, label: ev.name, sub: ev.password }))}
                  selected={`${selectedPassword}|${selectedEventId}`}
                  onSelect={(val) => {
                    const [pw, evId] = val.split('|')
                    setSelectedPassword(pw)
                    setSelectedEventId(evId ?? '')
                    setFolders([])
                    setSelectedFolderId('')
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Btn variant="bezel" onClick={() => void loadFolders()} disabled={loadingFolders || !selectedPassword}>
                    {loadingFolders ? 'Načítám složky…' : 'Načíst složky'}
                  </Btn>
                </div>
              </div>
            )}
            {folders.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Složka Výsledků:</div>
                <PickerList
                  items={folders.map((f) => ({ id: f.id, label: f.name, sub: f.parentId ? 'podsložka' : undefined }))}
                  selected={selectedFolderId}
                  onSelect={setSelectedFolderId}
                />
                <div style={{ marginTop: 8 }}>
                  <Btn
                    variant="primary"
                    onClick={() => void saveZavodMap()}
                    disabled={savingZavodMap || !selectedFolderId}
                  >
                    {savingZavodMap ? 'Ukládám…' : 'Uložit mapování'}
                  </Btn>
                </div>
              </div>
            )}
            <Hairline />
          </>
        )}

        {/* Section 3: Mapování kategorií */}
        {zavodMap && (
          <>
            <SekceNadpis>Mapování kategorií</SekceNadpis>
            <div style={{ marginBottom: 8 }}>
              <Btn variant="bezel" onClick={() => void autoMap()} disabled={autoMapping}>
                {autoMapping ? 'Páruji…' : 'Auto-párovat'}
              </Btn>
            </div>
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 16 }}>
              {katMaps.map((m, i) => (
                <div
                  key={m.kategorieId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 12px',
                    fontSize: 12.5,
                    borderTop: i === 0 ? 'none' : '0.5px solid var(--separator)'
                  }}
                >
                  <span style={{ flex: 1, fontWeight: 540 }}>{m.kategorieNazev}</span>
                  <span style={{ color: m.folderId ? 'var(--muted)' : 'var(--text-4)', fontSize: 12 }}>
                    {m.folderName ?? 'nenalezeno'}
                  </span>
                  {m.folderId && (
                    <Btn variant="plain" onClick={() => void clearKatMap(m.kategorieId)}>Smazat</Btn>
                  )}
                </div>
              ))}
            </div>
            <Hairline />
          </>
        )}

        {/* Section 4: Publikování */}
        {zavodMap && mappedKat.length > 0 && (
          <>
            <SekceNadpis>Publikování</SekceNadpis>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {mappedKat.map((k) => {
                const res = publishResults[k.id]
                return (
                  <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 540 }}>{k.nazev}</span>
                    {res && (
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {res.created > 0 && `nových ${res.created} · `}
                        {res.updated > 0 && `aktualizováno ${res.updated} · `}
                        {res.skipped > 0 && `přeskočeno ${res.skipped}`}
                        {res.failed > 0 && <span style={{ color: 'var(--danger)' }}>{` · chyby ${res.failed}`}</span>}
                      </span>
                    )}
                    <Btn
                      variant="bezel"
                      onClick={() => void publishCategory(k.id)}
                      disabled={publishing[k.id]}
                    >
                      {publishing[k.id] ? 'Publikuji…' : 'Publikovat'}
                    </Btn>
                  </div>
                )
              })}
            </div>
            <Hairline />
          </>
        )}

        {/* Section 5: Log */}
        {log.length > 0 && (
          <>
            <SekceNadpis>Poslední akce</SekceNadpis>
            <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
              {log.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 10px',
                    fontSize: 11.5,
                    borderTop: i === 0 ? 'none' : '0.5px solid var(--separator)',
                    color: 'var(--muted)'
                  }}
                >
                  <span style={{ color: entry.status === 'ok' || entry.status === 'created' || entry.status === 'updated' ? 'var(--success)' : 'var(--danger)', fontSize: 11 }}>
                    {entry.status === 'ok' || entry.status === 'created' || entry.status === 'updated' ? '✓' : '✗'}
                  </span>
                  <span style={{ flex: 1 }}>
                    {entry.kategorieNazev ?? '—'}{entry.listKey ? ` / ${entry.listKey}` : ''}{' '}
                    <span style={{ color: 'var(--muted)' }}>{entry.action}</span>
                  </span>
                  <span style={{ color: 'var(--text-4)', fontSize: 11 }}>
                    {entry.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Placeholder for zavod without map */}
        {!zavodMap && !apiKeySet && (
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
            Nejprve zadejte API klíč Sportity.
          </p>
        )}
      </div>
    </Modal>
  )
}

function SekceNadpis({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <h3 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 620, color: 'var(--foreground)' }}>
      {children}
    </h3>
  )
}

function Hairline(): React.JSX.Element {
  return <Separator className="my-[15px]" />
}


function PickerList({
  items,
  selected,
  onSelect
}: {
  items: { id: string; label: string; sub?: string }[]
  selected: string
  onSelect: (id: string) => void
}): React.JSX.Element {
  return (
    <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 160, overflowY: 'auto' }}>
      {items.map((item, i) => (
        <div
          key={item.id}
          onClick={() => onSelect(item.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', fontSize: 13, cursor: 'pointer',
            borderTop: i === 0 ? 'none' : '0.5px solid var(--separator)',
            background: selected === item.id
              ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
              : i % 2 === 0 ? 'transparent' : 'var(--surface-secondary)',
            color: selected === item.id ? 'var(--accent)' : 'var(--foreground)'
          }}
        >
          <span style={{ flex: 1, fontWeight: selected === item.id ? 600 : 430 }}>{item.label}</span>
          {item.sub && (
            <span style={{ fontSize: 11.5, color: selected === item.id ? 'var(--accent)' : 'var(--muted)' }}>
              {item.sub}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
