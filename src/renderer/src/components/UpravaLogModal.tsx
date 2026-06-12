import { useCallback, useEffect, useState } from 'react'
import type { UpravaLogRadek, UpravaTyp, KoloTyp } from '@shared/types'
import { Button, Chip, Modal, Table } from '@heroui/react'

const KOLA_LABEL: Record<KoloTyp, string> = {
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
  SF: 'Semifinále',
  F: 'Finále'
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
    day: 'numeric', month: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatHodnota(typ: UpravaTyp, hodnota: number | null): string {
  if (hodnota === null) return '—'
  switch (typ) {
    case 'CASOVA_PENALIZACE': return `+${hodnota / 1000} s`
    case 'BODOVA_PENALIZACE': return hodnota >= 0 ? `+${hodnota} b` : `${hodnota} b`
    case 'POSUN_PORADI': return `${hodnota}. místo`
    default: return String(hodnota)
  }
}

interface UpravaLogModalProps {
  kategorieId: number
  kategorieNazev: string
  onClose: () => void
}

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
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose() }}>
        <Modal.Container>
          <Modal.Dialog className="w-[720px] max-w-[calc(100vw-2rem)]">
            <Modal.Header>
              <span className="text-base font-semibold">Zásahy ředitele</span>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-3">
              <p className="text-[13px] text-muted">
                Kategorie <strong className="text-foreground font-[600]">{kategorieNazev}</strong> — chronologický
                přehled všech zásahů (nejnovější nahoře). Kdo rozhodl: operátor / ředitel (bez přihlášení).
              </p>

              {nacita && radky.length === 0 && (
                <p className="text-[13px] text-muted">Načítám…</p>
              )}

              {!nacita && radky.length === 0 && (
                <p className="text-[13px] text-muted">
                  V této kategorii zatím nebyl žádný zásah ředitele.
                </p>
              )}

              {radky.length > 0 && (
                <Table>
                  <Table.ScrollContainer>
                    <Table.Content aria-label="Zásahy ředitele">
                      <Table.Header>
                        <Table.Column isRowHeader>Kdy</Table.Column>
                        <Table.Column>Druh</Table.Column>
                        <Table.Column>Hodnota</Table.Column>
                        <Table.Column>Jezdec / jízda</Table.Column>
                        <Table.Column>Důvod</Table.Column>
                      </Table.Header>
                      <Table.Body>
                        {radky.map((r, i) => (
                          <Table.Row key={r.id} id={r.id} className={i % 2 ? 'bg-muted/[0.04]' : ''}>
                            <Table.Cell className="tabular-nums text-muted text-[12px]">
                              {formatKdy(r.kdy)}
                            </Table.Cell>
                            <Table.Cell>
                              <TypBadge typ={r.typ} />
                            </Table.Cell>
                            <Table.Cell className="tabular-nums font-[590]" style={{
                              color: r.typ === 'ZRUSENI'
                                ? 'color-mix(in srgb, var(--color-foreground) 35%, transparent)'
                                : 'var(--color-foreground)'
                            }}>
                              {formatHodnota(r.typ, r.hodnota)}
                            </Table.Cell>
                            <Table.Cell>
                              <div className="font-[590] text-foreground">
                                {r.st_cislo != null ? `${r.st_cislo} ` : ''}
                                {r.prijmeni} {r.jmeno}
                              </div>
                              <div className="text-muted mt-0.5 text-[12px]">
                                {KOLA_LABEL[r.kolo_typ] ?? r.kolo_typ} · {r.jizda_cislo}. jízda
                              </div>
                            </Table.Cell>
                            <Table.Cell className="text-muted text-[12.5px] leading-snug">
                              {r.duvod}
                              <div className="mt-1 text-[11px] opacity-60">{r.rozhodl}</div>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table>
              )}
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onPress={() => void nacti()} isDisabled={nacita}>
                Obnovit
              </Button>
              <Button size="sm" onPress={onClose}>
                Zavřít
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

function TypBadge({ typ }: { typ: UpravaTyp }): React.JSX.Element {
  const color =
    typ === 'CASOVA_PENALIZACE' ? 'accent' :
    typ === 'BODOVA_PENALIZACE' ? 'danger' :
    typ === 'POSUN_PORADI' ? 'warning' :
    'default'
  return (
    <Chip size="sm" variant="soft" color={color as 'accent' | 'danger' | 'warning' | 'default'}>
      {TYP_LABEL[typ]}
    </Chip>
  )
}
