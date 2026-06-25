import { useMemo } from 'react'
import type { Jezdec, JezdecPole } from '@shared/types'
import { Button, Chip, Table } from '@heroui/react'
import { ArrowDownToSquare, Plus, TrashBin } from '@gravity-ui/icons'
import { EditableCell } from '../components/table'

interface Col {
  key: JezdecPole
  header: string
  width: number
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

const ALL_COLS = [...COLS, { key: 'akce' as const, header: '', width: 46, num: false }]

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
  const sorted = useMemo(
    () => [...jezdci].sort((a, b) => (a.los ?? 9999) - (b.los ?? 9999)),
    [jezdci]
  )
  const bezLosu = useMemo(() => jezdci.filter((j) => j.los === null).length, [jezdci])

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
    <div className="race-table-screen start-list-screen">
      <div className="start-list-shell">
        <div className="start-list-header flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-[680] tracking-tight">Startovní listina</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">{subText}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onPress={onImport}>
              <ArrowDownToSquare width={14} height={14} />
              Importovat z Excelu
            </Button>
            <Button size="sm" onPress={onAdd}>
              <Plus width={13} height={13} />
              Přidat jezdce
            </Button>
          </div>
        </div>

        <div className="start-list-table-wrap">
          <Table className="race-table-root start-list-table-root">
            <Table.ScrollContainer className="race-table-scroll start-list-table-scroll">
              <Table.Content aria-label="Startovní listina">
                <Table.Header columns={ALL_COLS}>
                  {(c) => (
                    <Table.Column
                      id={c.key}
                      isRowHeader={c.key === 'prijmeni'}
                      aria-label={c.key === 'akce' ? 'akce' : undefined}
                      style={{ width: c.width }}
                    >
                      {c.header}
                    </Table.Column>
                  )}
                </Table.Header>
                <Table.Body
                  renderEmptyState={() => (
                    <div className="flex h-20 items-center justify-center text-sm text-muted">
                      Zatím žádní jezdci — naimportuj je z Excelu nebo přidej ručně.
                    </div>
                  )}
                >
                  {sorted.map((d, i) => {
                    const cekaNaPrejimku = d.los === null
                    return (
                      <Table.Row
                        key={d.id}
                        id={d.id}
                        className={`group ${zebra && i % 2 ? 'bg-muted/[0.04]' : ''} ${cekaNaPrejimku ? 'start-list-row-pending' : ''}`}
                      >
                        {COLS.map((c) => (
                          <Table.Cell key={c.key} className="h-[38px] px-3.5 py-0">
                            <div
                              className={`start-list-cell-inner ${cekaNaPrejimku ? 'start-list-cell-inner--pending' : ''}`}
                            >
                              {c.key === 'prijmeni' && cekaNaPrejimku ? (
                                <div className="flex w-full min-w-0 items-center gap-1.5">
                                  <EditableCell
                                    value={d[c.key]}
                                    num={c.num}
                                    weight={c.weight}
                                    onCommit={(raw) => commit(d.id, c, raw)}
                                  />
                                  <Chip size="sm" variant="soft">Bez přejímky</Chip>
                                </div>
                              ) : (
                                <EditableCell
                                  value={d[c.key]}
                                  num={c.num}
                                  weight={c.weight}
                                  onCommit={(raw) => commit(d.id, c, raw)}
                                />
                              )}
                            </div>
                          </Table.Cell>
                        ))}
                        <Table.Cell className="h-[38px] px-1.5 py-0 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            isIconOnly
                            aria-label="Smazat jezdce"
                            onPress={() => onDelete(d)}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <TrashBin width={15} height={15} />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>
      </div>
    </div>
  )
}
