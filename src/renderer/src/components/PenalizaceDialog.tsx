import { useEffect, useState } from 'react'
import type { VysledekRadek } from '@shared/types'
import { Button, Modal } from '@heroui/react'
import { fmtTime } from '../lib/time'
import { safeCall } from '../lib/api'

export interface PenalizaceTarget {
  jizdaId: number
  radek: VysledekRadek
  /** Počet jezdců s pořadím v jízdě (pro posun). */
  maxPoradi: number
}

type DruhPenalizace = 'CASOVA' | 'BODOVA' | 'POSUN'

interface PenalizaceDialogProps {
  target: PenalizaceTarget
  onClose: () => void
  onSaved: () => void
}

const inputCls =
  'w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] text-foreground font-[inherit] ' +
  'focus:outline-none focus:ring-[3.5px] focus:ring-primary/25 focus:border-primary'

function formatDelta(n: number): string {
  return n >= 0 ? `+${n}` : String(n)
}

function vychoziDruh(r: VysledekRadek): DruhPenalizace {
  if (r.uprava_typ === 'BODOVA_PENALIZACE') return 'BODOVA'
  if (r.uprava_typ === 'POSUN_PORADI' || r.rucni_poradi != null) return 'POSUN'
  if (r.penalizace_ms > 0) return 'CASOVA'
  return 'CASOVA'
}

function typZruseni(druh: DruhPenalizace): 'CASOVA_PENALIZACE' | 'BODOVA_PENALIZACE' | 'POSUN_PORADI' {
  if (druh === 'BODOVA') return 'BODOVA_PENALIZACE'
  if (druh === 'POSUN') return 'POSUN_PORADI'
  return 'CASOVA_PENALIZACE'
}

/** Dialog penalizace ředitele (časová, bodová, posun pořadí). */
export function PenalizaceDialog({
  target,
  onClose,
  onSaved
}: PenalizaceDialogProps): React.JSX.Element {
  const { radek, maxPoradi } = target
  const maCasovou = radek.penalizace_ms > 0
  const maBodovou = radek.uprava_typ === 'BODOVA_PENALIZACE'
  const maPosun = radek.rucni_poradi != null

  const [druh, setDruh] = useState<DruhPenalizace>(() => vychoziDruh(radek))
  const [sekundy, setSekundy] = useState(maCasovou ? String(radek.penalizace_ms / 1000) : '')
  const [delta, setDelta] = useState(
    maBodovou && radek.uprava_hodnota != null ? String(radek.uprava_hodnota) : ''
  )
  const [pozice, setPozice] = useState(String(radek.rucni_poradi ?? radek.poradi ?? 1))
  const [autoBody, setAutoBody] = useState<number | null>(null)
  const [duvod, setDuvod] = useState(radek.uprava_duvod ?? '')
  const [chyba, setChyba] = useState<string | null>(null)
  const [uklada, setUklada] = useState(false)

  useEffect(() => {
    if (druh !== 'BODOVA') return
    let live = true
    safeCall(window.api.getAutoBodyJizdy(target.jizdaId, radek.jezdec_id).then((b) => {
      if (live) setAutoBody(b)
    }))
    return () => { live = false }
  }, [druh, target.jizdaId, radek.jezdec_id])

  const uloz = async (): Promise<void> => {
    const d = duvod.trim()
    if (!d) { setChyba('Důvod zásahu ředitele je povinný'); return }
    setChyba(null)
    setUklada(true)
    try {
      if (druh === 'CASOVA') {
        const s = Number.parseFloat(sekundy.replace(',', '.'))
        if (!Number.isFinite(s) || s < 0) {
          setChyba('Zadej nezáporný počet sekund (např. 10)')
          setUklada(false)
          return
        }
        await window.api.setCasovaPenalizace({ jizdaId: target.jizdaId, jezdecId: radek.jezdec_id, sekundy: s, duvod: d })
      } else if (druh === 'BODOVA') {
        const del = Number.parseInt(delta.replace(',', '.'), 10)
        if (!Number.isFinite(del)) {
          setChyba('Zadej úpravu bodů jako celé číslo (např. −5)')
          setUklada(false)
          return
        }
        await window.api.setBodovaPenalizace({ jizdaId: target.jizdaId, jezdecId: radek.jezdec_id, delta: del, duvod: d })
      } else {
        const p = Number.parseInt(pozice, 10)
        if (!Number.isFinite(p) || p < 1 || p > maxPoradi) {
          setChyba(`Zadej pořadí od 1 do ${maxPoradi}`)
          setUklada(false)
          return
        }
        await window.api.setPosunPoradi({ jizdaId: target.jizdaId, jezdecId: radek.jezdec_id, poradi: p, duvod: d })
      }
      onSaved()
      onClose()
    } catch (e) {
      setChyba(e instanceof Error ? e.message : 'Uložení se nepovedlo')
    } finally {
      setUklada(false)
    }
  }

  const zrus = async (): Promise<void> => {
    const d = duvod.trim()
    if (!d) { setChyba('Uveď důvod zrušení penalizace'); return }
    setChyba(null)
    setUklada(true)
    try {
      await window.api.zrusPenalizaci({
        jizdaId: target.jizdaId,
        jezdecId: radek.jezdec_id,
        typ: typZruseni(druh),
        duvod: d
      })
      onSaved()
      onClose()
    } catch (e) {
      setChyba(e instanceof Error ? e.message : 'Zrušení se nepovedlo')
    } finally {
      setUklada(false)
    }
  }

  const efektivni =
    radek.stav === 'OK' && radek.namereny_cas_ms != null
      ? radek.namereny_cas_ms + radek.penalizace_ms
      : null

  const deltaNum = Number.parseInt(delta.replace(',', '.'), 10)
  const deltaPreview =
    autoBody != null && Number.isFinite(deltaNum) ? autoBody + deltaNum : null

  const maAktivni = druh === 'CASOVA' ? maCasovou : druh === 'BODOVA' ? maBodovou : maPosun
  const poziceOptions = Array.from({ length: maxPoradi }, (_, i) => i + 1)

  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose() }}>
        <Modal.Container>
          <Modal.Dialog className="w-[480px] max-w-[calc(100vw-2rem)]">
            <Modal.Header>
              <span className="text-base font-semibold">Penalizace ředitele</span>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-3.5">
              <p className="text-[13px]">
                <strong className="text-foreground font-[600]">
                  {radek.st_cislo} — {radek.prijmeni} {radek.jmeno}
                </strong>
                {radek.poradi != null && (
                  <span className="text-muted font-[450]"> (aktuálně {radek.poradi}. v jízdě)</span>
                )}
              </p>

              <label className="block">
                <span className="mb-1.5 block text-[12px] text-muted">Druh zásahu</span>
                <select
                  value={druh}
                  onChange={(e) => setDruh(e.target.value as DruhPenalizace)}
                  className={inputCls}
                >
                  <option value="CASOVA">Časová (+ sekundy k času)</option>
                  <option value="BODOVA">Bodová (úprava bodů v jízdě)</option>
                  <option value="POSUN">Posun pořadí (degradace / přesun)</option>
                </select>
              </label>

              {druh === 'CASOVA' && (
                <>
                  <p className="text-[12.5px] text-muted">
                    Přičte sekundy k naměřenému času. Pořadí a body v jízdě se přepočítají; naměřený čas
                    zůstane v záznamu.
                  </p>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] text-muted">Penalizace (sekundy)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sekundy}
                      onChange={(e) => setSekundy(e.target.value)}
                      placeholder="např. 10"
                      className={inputCls}
                      autoFocus
                    />
                  </label>
                  {radek.namereny_cas_ms != null && (
                    <p className="text-[12px] text-muted">
                      Naměřeno: <span className="tabular-nums">{fmtTime(radek.namereny_cas_ms)}</span>
                      {efektivni != null && maCasovou && (
                        <> → výsledný čas: <span className="tabular-nums">{fmtTime(efektivni)}</span></>
                      )}
                    </p>
                  )}
                </>
              )}

              {druh === 'BODOVA' && (
                <>
                  <p className="text-[12.5px] text-muted">
                    Upraví body v této jízdě o zadanou hodnotu vůči automatickým bodům z pořadí/času.
                    Promítne se do klasifikace; pořadí v jízdě se nemění.
                  </p>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] text-muted">Úprava bodů (delta)</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={delta}
                      onChange={(e) => setDelta(e.target.value)}
                      placeholder="např. −5"
                      className={inputCls}
                      autoFocus
                    />
                  </label>
                  {autoBody === null && (
                    <p className="text-[12px] text-muted">
                      Automatická body zatím nejsou k dispozici — zadej nejdřív čas nebo stav v jízdě.
                    </p>
                  )}
                  {autoBody != null && (
                    <p className="text-[12px] text-muted">
                      Automat z jízdy: <span className="tabular-nums">{autoBody}</span>
                      {deltaPreview != null && Number.isFinite(deltaNum) && (
                        <>
                          {' '}→ po úpravě: <span className="tabular-nums">{deltaPreview}</span>
                          <span className="text-muted opacity-60"> ({formatDelta(deltaNum)})</span>
                        </>
                      )}
                    </p>
                  )}
                </>
              )}

              {druh === 'POSUN' && (
                <>
                  <p className="text-[12.5px] text-muted">
                    Přesune jezdce na zvolené pořadí v jízdě; ostatní se posunou. Body dojetých se přepočítají
                    z žebříčku podle nového pořadí (čas se nemění).
                  </p>
                  {radek.poradi == null ? (
                    <p className="text-[12px] text-danger">
                      Nejprve zadej čas nebo stav — bez pořadí v jízdě nelze posunout.
                    </p>
                  ) : (
                    <label className="block">
                      <span className="mb-1.5 block text-[12px] text-muted">Cílové pořadí v jízdě</span>
                      <select
                        value={pozice}
                        onChange={(e) => setPozice(e.target.value)}
                        className={inputCls}
                        autoFocus
                      >
                        {poziceOptions.map((p) => (
                          <option key={p} value={String(p)}>{p}. místo</option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              <label className="block">
                <span className="mb-1.5 block text-[12px] text-muted">Důvod / poznámka (povinné)</span>
                <textarea
                  value={duvod}
                  onChange={(e) => setDuvod(e.target.value)}
                  rows={3}
                  placeholder="např. předjetí, nesportovní chování…"
                  className={`${inputCls} resize-y min-h-[72px]`}
                />
              </label>

              {chyba && (
                <p className="text-[12.5px] text-danger" role="alert">{chyba}</p>
              )}
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              {maAktivni && (
                <Button variant="ghost" size="sm" onPress={() => void zrus()} isDisabled={uklada}>
                  Zrušit penalizaci
                </Button>
              )}
              <Button variant="ghost" size="sm" onPress={onClose}>
                Zavřít
              </Button>
              <Button size="sm" onPress={() => void uloz()} isDisabled={uklada}>
                Uložit
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
