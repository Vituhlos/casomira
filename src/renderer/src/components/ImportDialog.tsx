import { useMemo, useState } from 'react'
import type { ImportCommit, ImportPolicy, ImportPreview } from '@shared/types'
import { Button, Chip, Modal } from '@heroui/react'
import { ArrowUpFromSquare } from '@gravity-ui/icons'

interface ImportDialogProps {
  preview: ImportPreview
  onCancel: () => void
  onConfirm: (commit: ImportCommit) => void
}

export function ImportDialog({ preview, onCancel, onConfirm }: ImportDialogProps): React.JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(preview.listy.filter((l) => l.kategorieId !== null).map((l) => l.sheet))
  )
  const [policy, setPolicy] = useState<ImportPolicy>('skip')

  const toggle = (sheet: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(sheet)) next.delete(sheet)
      else next.add(sheet)
      return next
    })
  }

  const { nove, kolize, celkem } = useMemo(() => {
    let nove = 0
    let kolize = 0
    for (const l of preview.listy) {
      if (l.kategorieId === null || !selected.has(l.sheet)) continue
      nove += l.pocet - l.konflikty
      kolize += l.konflikty
    }
    const celkem = nove + (policy === 'overwrite' ? kolize : 0)
    return { nove, kolize, celkem }
  }, [preview, selected, policy])

  const confirm = (): void => {
    const listy = preview.listy
      .filter((l) => l.kategorieId !== null && selected.has(l.sheet))
      .map((l) => ({ kategorieId: l.kategorieId as number, jezdci: l.jezdci }))
    onConfirm({ listy, policy })
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onCancel() }}>
        <Modal.Container>
          <Modal.Dialog className="w-[620px] max-w-[calc(100vw-2rem)]">
            <Modal.Header>
              <span className="text-base font-semibold">Import z Excelu</span>
            </Modal.Header>

            <Modal.Body>
              <p className="mb-3 text-[12.5px] text-muted">
                Vyber listy, které chceš naimportovat do příslušných kategorií. Zápis proběhne až
                po potvrzení.
              </p>

              <div className="overflow-clip rounded-xl border border-border">
                {preview.listy.map((l, i) => {
                  const matched = l.kategorieId !== null
                  const on = selected.has(l.sheet)
                  return (
                    <label
                      key={l.sheet}
                      className={[
                        'flex items-center gap-2.5 px-3 py-2.5',
                        i > 0 ? 'border-t border-border/60' : '',
                        matched ? 'cursor-pointer' : 'cursor-default opacity-55'
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!matched}
                        onChange={() => toggle(l.sheet)}
                        className="h-4 w-4 shrink-0"
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-[13px] font-[560]">{l.sheet}</span>
                        <span className="text-muted"> → </span>
                        {matched ? (
                          <span className="text-[13px]">{l.mappedNazev}</span>
                        ) : (
                          <span className="text-[12.5px] text-danger">
                            kategorie „{l.mappedNazev}" nenalezena — přeskočí se
                          </span>
                        )}
                        {l.losKolize.length > 0 && (
                          <div className="mt-0.5 text-[11.5px] text-danger">
                            ⚠ Duplicitní los v listu: {l.losKolize.join(', ')} — oprav v Excelu
                            (los musí být unikátní)
                          </div>
                        )}
                        {l.bezLosu > 0 && (
                          <div className="mt-0.5 text-[11.5px] text-muted">
                            {l.bezLosu} jezdců bez losu — naimportují se, ale nebudou zařazeni do
                            roštů (neprojeli přejímkou)
                          </div>
                        )}
                      </span>
                      <span className="tabular-nums text-[12.5px] text-muted">
                        {l.pocet} jezdců
                      </span>
                      {l.konflikty > 0 && (
                        <Chip size="sm" variant="soft" color="warning" className="tabular-nums shrink-0">
                          {l.konflikty}× existuje
                        </Chip>
                      )}
                    </label>
                  )
                })}
              </div>

              {kolize > 0 && (
                <div className="mt-3.5 flex items-center justify-between gap-3">
                  <span className="text-[12.5px] text-muted">
                    U {kolize} startovních čísel, která už existují:
                  </span>
                  <div className="flex w-fit gap-1 rounded-lg border border-border p-0.5">
                    {(
                      [
                        ['skip', 'Přeskočit'],
                        ['overwrite', 'Přepsat']
                      ] as [ImportPolicy, string][]
                    ).map(([val, label]) => (
                      <Button
                        key={val}
                        size="sm"
                        variant={policy === val ? 'secondary' : 'ghost'}
                        onPress={() => setPolicy(val)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-3 text-[12px] text-muted">
                Uloží se {nove} nových
                {kolize > 0 &&
                  (policy === 'overwrite'
                    ? ` a přepíše ${kolize} existujících`
                    : ` (${kolize} existujících přeskočeno)`)}
                .
              </p>
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="secondary" onPress={onCancel}>
                Zrušit
              </Button>
              <Button onPress={confirm} isDisabled={celkem === 0}>
                <ArrowUpFromSquare width={14} height={14} />
                Uložit ({celkem} jezdců)
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
