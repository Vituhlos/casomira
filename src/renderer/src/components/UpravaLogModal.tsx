import { useCallback, useEffect, useState } from 'react'
import type { UpravaLogRadek, UpravaTyp, KoloTyp } from '@shared/types'
import { Modal } from './Modal'
import { Btn } from './ui'
import { Card, Row, tdStyle, thStyle } from './table'

const KOLA_LABEL: Record<KoloTyp, string> = {
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  SF: 'Semifinále',
  F: 'Finále',
  F_A: 'Finále A',
  F_B: 'Finále B'
}

const TYP_LABEL: Record<UpravaTyp, string> = {
  CASOVA_PENALIZACE: 'Časová',
  BODOVA_PENALIZACE: 'Bodová',
  POSUN_PORADI: 'Posun pořadí',
  ZRUSENI: 'Zrušení'
}

function formatKdy(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatHodnota(typ: UpravaTyp, hodnota: number | null): string {
  if (hodnota === null) return '—'
  switch (typ) {
    case 'CASOVA_PENALIZACE':
      return `+${hodnota / 1000} s`
    case 'BODOVA_PENALIZACE':
      return hodnota >= 0 ? `+${hodnota} b` : `${hodnota} b`
    case 'POSUN_PORADI':
      return `${hodnota}. místo`
    default:
      return String(hodnota)
  }
}

interface UpravaLogModalProps {
  kategorieId: number
  kategorieNazev: string
  onClose: () => void
}

/** Přehled auditního logu zásahů ředitele v kategorii. */
export function UpravaLogModal({
  kategorieId,
  kategorieNazev,
  onClose
}: UpravaLogModalProps): React.JSX.Element {
  const [radky, setRadky] = useState<UpravaLogRadek[]>([])
  const [nacita, setNacita] = useState(true)

  const nacti = useCallback(async (): Promise<void> => {
    setNacita(true)
    try {
      setRadky(await window.api.listUpravaLog(kategorieId))
    } finally {
      setNacita(false)
    }
  }, [kategorieId])

  useEffect(() => {
    void nacti()
    const off = window.api.onDataChanged?.(() => void nacti())
    return () => off?.()
  }, [nacti])

  return (
    <Modal
      title="Zásahy ředitele"
      width={720}
      onClose={onClose}
      footer={
        <>
          <Btn variant="plain" onClick={() => void nacti()} disabled={nacita}>
            Obnovit
          </Btn>
          <Btn variant="primary" onClick={onClose}>
            Zavřít
          </Btn>
        </>
      }
    >
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-2)' }}>
        Kategorie <strong style={{ color: 'var(--text-1)' }}>{kategorieNazev}</strong> — chronologický
        přehled všech zásahů (nejnovější nahoře). Kdo rozhodl: operátor / ředitel (bez přihlášení).
      </p>

      {nacita && radky.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>Načítám…</p>
      )}

      {!nacita && radky.length === 0 && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>
          V této kategorii zatím nebyl žádný zásah ředitele.
        </p>
      )}

      {radky.length > 0 && (
        <Card style={{ margin: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 128 }} />
              <col style={{ width: 108 }} />
              <col style={{ width: 88 }} />
              <col style={{ width: 140 }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                {['Kdy', 'Druh', 'Hodnota', 'Jezdec / jízda', 'Důvod'].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {radky.map((r, i) => (
                <Row key={r.id} i={i} zebra>
                  <td style={{ ...tdStyle, fontSize: 12, color: 'var(--text-2)' }}>
                    <span className="tnum">{formatKdy(r.kdy)}</span>
                  </td>
                  <td style={tdStyle}>
                    <TypBadge typ={r.typ} />
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 590,
                      color: r.typ === 'ZRUSENI' ? 'var(--text-3)' : 'var(--text-1)'
                    }}
                  >
                    {formatHodnota(r.typ, r.hodnota)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12.5 }}>
                    <div style={{ fontWeight: 590, color: 'var(--text-1)' }}>
                      {r.st_cislo != null ? `${r.st_cislo} ` : ''}
                      {r.prijmeni} {r.jmeno}
                    </div>
                    <div style={{ color: 'var(--text-3)', marginTop: 2 }}>
                      {KOLA_LABEL[r.kolo_typ] ?? r.kolo_typ} · {r.jizda_cislo}. jízda
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.35 }}>
                    {r.duvod}
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-4)' }}>
                      {r.rozhodl}
                    </div>
                  </td>
                </Row>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Modal>
  )
}

function TypBadge({ typ }: { typ: UpravaTyp }): React.JSX.Element {
  const colors: Record<UpravaTyp, { bg: string; fg: string }> = {
    CASOVA_PENALIZACE: {
      bg: 'color-mix(in srgb, var(--accent) 14%, transparent)',
      fg: 'var(--accent-text)'
    },
    BODOVA_PENALIZACE: {
      bg: 'color-mix(in srgb, #c93636 12%, transparent)',
      fg: '#c93636'
    },
    POSUN_PORADI: {
      bg: 'color-mix(in srgb, #b8860b 14%, transparent)',
      fg: '#9a7209'
    },
    ZRUSENI: {
      bg: 'var(--seg-track)',
      fg: 'var(--text-3)'
    }
  }
  const c = colors[typ]
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 650,
        padding: '2px 8px',
        borderRadius: 99,
        background: c.bg,
        color: c.fg,
        whiteSpace: 'nowrap'
      }}
    >
      {TYP_LABEL[typ]}
    </span>
  )
}
