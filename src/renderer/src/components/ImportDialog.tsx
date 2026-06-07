import { useMemo, useState } from 'react'
import type { ImportCommit, ImportPolicy, ImportPreview } from '@shared/types'
import { Modal } from './Modal'
import { Btn } from './ui'

interface ImportDialogProps {
  preview: ImportPreview
  onCancel: () => void
  onConfirm: (commit: ImportCommit) => void
}

export function ImportDialog({ preview, onCancel, onConfirm }: ImportDialogProps): React.JSX.Element {
  // Výchozí výběr: všechny listy, které se podařilo napárovat na kategorii.
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

  // Souhrn podle aktuálního výběru a volby pro kolize.
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
    <Modal
      title="Import z Excelu"
      width={620}
      onClose={onCancel}
      footer={
        <>
          <Btn variant="plain" onClick={onCancel}>
            Zrušit
          </Btn>
          <Btn variant="primary" icon="import" onClick={confirm} disabled={celkem === 0}>
            Uložit ({celkem} jezdců)
          </Btn>
        </>
      }
    >
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text-2)' }}>
        Vyber listy, které chceš naimportovat do příslušných kategorií. Zápis proběhne až
        po potvrzení.
      </p>

      <div
        style={{
          border: '0.5px solid var(--hairline)',
          borderRadius: 'var(--r-ctrl)',
          overflow: 'hidden'
        }}
      >
        {preview.listy.map((l, i) => {
          const matched = l.kategorieId !== null
          const on = selected.has(l.sheet)
          return (
            <label
              key={l.sheet}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderTop: i === 0 ? 'none' : '0.5px solid var(--divider)',
                cursor: matched ? 'pointer' : 'default',
                opacity: matched ? 1 : 0.55
              }}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={!matched}
                onChange={() => toggle(l.sheet)}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 560 }}>{l.sheet}</span>
                <span style={{ color: 'var(--text-3)' }}> → </span>
                {matched ? (
                  <span style={{ fontSize: 13 }}>{l.mappedNazev}</span>
                ) : (
                  <span style={{ fontSize: 12.5, color: '#c93636' }}>
                    kategorie „{l.mappedNazev}" nenalezena — přeskočí se
                  </span>
                )}
                {l.losKolize.length > 0 && (
                  <div style={{ fontSize: 11.5, color: '#c93636', marginTop: 3 }}>
                    ⚠ Duplicitní los v listu: {l.losKolize.join(', ')} — oprav v Excelu (los musí být
                    unikátní)
                  </div>
                )}
                {l.bezLosu > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>
                    {l.bezLosu} jezdců bez losu — naimportují se, ale nebudou zařazeni do roštů
                    (neprojeli přejímkou)
                  </div>
                )}
              </span>
              <span className="tnum" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                {l.pocet} jezdců
              </span>
              {l.konflikty > 0 && (
                <span
                  className="tnum"
                  style={{
                    fontSize: 11.5,
                    color: '#9a6400',
                    background: 'rgba(255,159,10,0.16)',
                    borderRadius: 'var(--r-pill)',
                    padding: '2px 8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {l.konflikty}× existuje
                </span>
              )}
            </label>
          )
        })}
      </div>

      {kolize > 0 && (
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
            U {kolize} startovních čísel, která už existují:
          </span>
          <div
            style={{
              display: 'flex',
              gap: 2,
              background: 'var(--seg-track)',
              borderRadius: 8,
              padding: 2
            }}
          >
            {(
              [
                ['skip', 'Přeskočit'],
                ['overwrite', 'Přepsat']
              ] as [ImportPolicy, string][]
            ).map(([val, label]) => {
              const active = policy === val
              return (
                <button
                  key={val}
                  onClick={() => setPolicy(val)}
                  style={{
                    height: 26,
                    padding: '0 12px',
                    border: 'none',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontSize: 12.5,
                    fontWeight: active ? 590 : 450,
                    color: active ? 'var(--text-1)' : 'var(--text-2)',
                    background: active ? 'var(--seg-sel)' : 'transparent',
                    borderRadius: 7,
                    boxShadow: active ? 'var(--seg-sel-shadow)' : 'none'
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
        Uloží se {nove} nových
        {kolize > 0 &&
          (policy === 'overwrite'
            ? ` a přepíše ${kolize} existujících`
            : ` (${kolize} existujících přeskočeno)`)}
        .
      </p>
    </Modal>
  )
}
