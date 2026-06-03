import { useEffect, useState, type CSSProperties } from 'react'
import type { VysledekRadek } from '@shared/types'
import { Modal } from './Modal'
import { Btn } from './ui'
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

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '0.5px solid var(--hairline)',
  background: 'var(--window)',
  font: 'inherit',
  fontSize: 13,
  color: 'var(--text-1)'
}

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
  const [sekundy, setSekundy] = useState(
    maCasovou ? String(radek.penalizace_ms / 1000) : ''
  )
  const [delta, setDelta] = useState(
    maBodovou && radek.uprava_hodnota != null ? String(radek.uprava_hodnota) : ''
  )
  const [pozice, setPozice] = useState(
    String(radek.rucni_poradi ?? radek.poradi ?? 1)
  )
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
    return () => {
      live = false
    }
  }, [druh, target.jizdaId, radek.jezdec_id])

  const uloz = async (): Promise<void> => {
    const d = duvod.trim()
    if (!d) {
      setChyba('Důvod zásahu ředitele je povinný')
      return
    }
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
        await window.api.setCasovaPenalizace({
          jizdaId: target.jizdaId,
          jezdecId: radek.jezdec_id,
          sekundy: s,
          duvod: d
        })
      } else if (druh === 'BODOVA') {
        const del = Number.parseInt(delta.replace(',', '.'), 10)
        if (!Number.isFinite(del)) {
          setChyba('Zadej úpravu bodů jako celé číslo (např. −5)')
          setUklada(false)
          return
        }
        await window.api.setBodovaPenalizace({
          jizdaId: target.jizdaId,
          jezdecId: radek.jezdec_id,
          delta: del,
          duvod: d
        })
      } else {
        const p = Number.parseInt(pozice, 10)
        if (!Number.isFinite(p) || p < 1 || p > maxPoradi) {
          setChyba(`Zadej pořadí od 1 do ${maxPoradi}`)
          setUklada(false)
          return
        }
        await window.api.setPosunPoradi({
          jizdaId: target.jizdaId,
          jezdecId: radek.jezdec_id,
          poradi: p,
          duvod: d
        })
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
    if (!d) {
      setChyba('Uveď důvod zrušení penalizace')
      return
    }
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

  const maAktivni =
    druh === 'CASOVA' ? maCasovou : druh === 'BODOVA' ? maBodovou : maPosun

  const poziceOptions = Array.from({ length: maxPoradi }, (_, i) => i + 1)

  return (
    <Modal
      title="Penalizace ředitele"
      width={480}
      onClose={onClose}
      footer={
        <>
          {maAktivni && (
            <Btn variant="plain" onClick={() => void zrus()} disabled={uklada}>
              Zrušit penalizaci
            </Btn>
          )}
          <Btn variant="plain" onClick={onClose}>
            Zavřít
          </Btn>
          <Btn variant="primary" onClick={() => void uloz()} disabled={uklada}>
            Uložit
          </Btn>
        </>
      }
    >
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-2)' }}>
        <strong style={{ color: 'var(--text-1)' }}>
          {radek.st_cislo} — {radek.prijmeni} {radek.jmeno}
        </strong>
        {radek.poradi != null && (
          <span style={{ color: 'var(--text-3)', fontWeight: 450 }}>
            {' '}
            (aktuálně {radek.poradi}. v jízdě)
          </span>
        )}
      </p>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
          Druh zásahu
        </span>
        <select
          value={druh}
          onChange={(e) => setDruh(e.target.value as DruhPenalizace)}
          style={inputStyle}
        >
          <option value="CASOVA">Časová (+ sekundy k času)</option>
          <option value="BODOVA">Bodová (úprava bodů v jízdě)</option>
          <option value="POSUN">Posun pořadí (degradace / přesun)</option>
        </select>
      </label>

      {druh === 'CASOVA' && (
        <>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text-3)' }}>
            Přičte sekundy k naměřenému času. Pořadí a body v jízdě se přepočítají; naměřený čas
            zůstane v záznamu.
          </p>
          <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
              Penalizace (sekundy)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={sekundy}
              onChange={(e) => setSekundy(e.target.value)}
              placeholder="např. 10"
              style={inputStyle}
              autoFocus
            />
          </label>
          {radek.namereny_cas_ms != null && (
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-2)' }}>
              Naměřeno: <span className="tnum">{fmtTime(radek.namereny_cas_ms)}</span>
              {efektivni != null && maCasovou && (
                <>
                  {' '}
                  → výsledný čas: <span className="tnum">{fmtTime(efektivni)}</span>
                </>
              )}
            </p>
          )}
        </>
      )}

      {druh === 'BODOVA' && (
        <>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text-3)' }}>
            Upraví body v této jízdě o zadanou hodnotu vůči automatickým bodům z pořadí/času.
            Promítne se do klasifikace; pořadí v jízdě se nemění.
          </p>
          <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
              Úprava bodů (delta)
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="např. −5"
              style={inputStyle}
              autoFocus
            />
          </label>
          {autoBody === null && (
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-3)' }}>
              Automatická body zatím nejsou k dispozici — zadej nejdřív čas nebo stav v jízdě.
            </p>
          )}
          {autoBody != null && (
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--text-2)' }}>
              Automat z jízdy: <span className="tnum">{autoBody}</span>
              {deltaPreview != null && Number.isFinite(deltaNum) && (
                <>
                  {' '}
                  → po úpravě: <span className="tnum">{deltaPreview}</span>
                  <span style={{ color: 'var(--text-3)' }}> ({formatDelta(deltaNum)})</span>
                </>
              )}
            </p>
          )}
        </>
      )}

      {druh === 'POSUN' && (
        <>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text-3)' }}>
            Přesune jezdce na zvolené pořadí v jízdě; ostatní se posunou. Body dojetých se přepočítají
            z žebříčku podle nového pořadí (čas se nemění).
          </p>
          {radek.poradi == null ? (
            <p style={{ margin: '0 0 14px', fontSize: 12, color: '#c93636' }}>
              Nejprve zadej čas nebo stav — bez pořadí v jízdě nelze posunout.
            </p>
          ) : (
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
                Cílové pořadí v jízdě
              </span>
              <select
                value={pozice}
                onChange={(e) => setPozice(e.target.value)}
                style={inputStyle}
                autoFocus
              >
                {poziceOptions.map((p) => (
                  <option key={p} value={String(p)}>
                    {p}. místo
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}

      <label style={{ display: 'block', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
          Důvod / poznámka (povinné)
        </span>
        <textarea
          value={duvod}
          onChange={(e) => setDuvod(e.target.value)}
          rows={3}
          placeholder="např. předjetí, nesportovní chování…"
          style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
        />
      </label>

      {chyba && (
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#c93636' }} role="alert">
          {chyba}
        </p>
      )}
    </Modal>
  )
}
