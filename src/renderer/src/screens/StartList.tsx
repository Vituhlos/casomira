import type { Jezdec, JezdecPole } from '@shared/types'
import { ContentHead } from '../components/ContentHead'
import { Btn } from '../components/ui'
import { Icon } from '../components/Icon'
import { Card, EditableCell, Row, tdStyle, thStyle } from '../components/table'

interface Col {
  key: JezdecPole
  header: string
  width: string | number
  num?: boolean
  weight?: number
}

const COLS: Col[] = [
  { key: 'los', header: 'Los', width: 70, num: true },
  { key: 'st_cislo', header: 'St. číslo', width: 94, num: true, weight: 600 },
  { key: 'prijmeni', header: 'Příjmení', width: 170, weight: 590 },
  { key: 'jmeno', header: 'Jméno', width: 140 },
  { key: 'znacka', header: 'Značka', width: 135 },
  { key: 'model', header: 'Model', width: 175 }
]

interface StartListProps {
  jezdci: Jezdec[]
  zebra: boolean
  onEdit: (id: number, pole: JezdecPole, hodnota: string | number | null) => Promise<boolean>
  onImport: () => void
  onAdd: () => void
  onDelete: (jezdec: Jezdec) => void
}

export function StartList({
  jezdci,
  zebra,
  onEdit,
  onImport,
  onAdd,
  onDelete
}: StartListProps): React.JSX.Element {
  // Řazení dle losu (prázdný los až nakonec).
  const sorted = [...jezdci].sort((a, b) => (a.los ?? 9999) - (b.los ?? 9999))
  const bezLosu = jezdci.filter((j) => j.los === null).length

  const commit = (id: number, col: Col, raw: string): Promise<boolean> => {
    if (col.num) {
      const trimmed = raw.trim()
      const n = parseInt(trimmed, 10)
      return onEdit(id, col.key, trimmed === '' || Number.isNaN(n) ? null : n)
    }
    return onEdit(id, col.key, raw)
  }

  const subText =
    bezLosu > 0
      ? `${jezdci.length} přihlášených · ${bezLosu} čeká na přejímku · řazeno dle losu`
      : `${jezdci.length} přihlášených · řazeno dle losu`

  return (
    <div className="screen-enter">
      <ContentHead title="Startovní listina" sub={subText}>
        <Btn icon="import" onClick={onImport}>
          Importovat z Excelu
        </Btn>
        <Btn variant="primary" icon="plus" onClick={onAdd}>
          Přidat jezdce
        </Btn>
      </ContentHead>

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            {COLS.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
            <col style={{ width: 46 }} />
          </colgroup>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} style={thStyle}>
                  {c.header}
                </th>
              ))}
              <th style={thStyle} aria-label="akce" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={COLS.length + 1}
                  style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-3)', height: 80 }}
                >
                  Zatím žádní jezdci — naimportuj je z Excelu nebo přidej ručně.
                </td>
              </tr>
            )}
            {sorted.map((d, i) => {
              const cekaNaPrejimku = d.los === null
              return (
                <Row key={d.id} i={i} zebra={zebra}>
                  {COLS.map((c) => (
                    <td
                      key={c.key}
                      style={{ ...tdStyle, opacity: cekaNaPrejimku ? 0.55 : 1 }}
                    >
                      {c.key === 'prijmeni' && cekaNaPrejimku ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <EditableCell
                            value={d[c.key]}
                            num={c.num}
                            weight={c.weight}
                            onCommit={(raw) => commit(d.id, c, raw)}
                          />
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              height: 18,
                              padding: '0 7px',
                              borderRadius: 'var(--r-ctrl)',
                              fontSize: 10.5,
                              fontWeight: 600,
                              letterSpacing: '0.02em',
                              background: 'rgba(120,120,128,0.14)',
                              color: 'var(--text-3)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Bez přejímky
                          </span>
                        </div>
                      ) : (
                        <EditableCell
                          value={d[c.key]}
                          num={c.num}
                          weight={c.weight}
                          onCommit={(raw) => commit(d.id, c, raw)}
                        />
                      )}
                    </td>
                  ))}
                  <td style={{ ...tdStyle, padding: '0 8px', textAlign: 'center' }}>
                    <button
                      className="row-action"
                      title="Smazat jezdce"
                      onClick={() => onDelete(d)}
                      style={{ display: 'inline-flex', padding: 4 }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </Row>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
