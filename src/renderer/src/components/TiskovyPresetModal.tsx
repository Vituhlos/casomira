import { useState } from 'react'
import type { Kategorie } from '@shared/types'
import { FileLetterP } from '@gravity-ui/icons'
import { Button } from '@heroui/react'
import { Modal } from './Modal'
import { Btn } from './ui'

// Statická definice presetu — musí odpovídat TISKOVY_PRESET v pdf.ts.
const PRESET_POLOZKY: { nazev: string; kopii: number }[] = [
  { nazev: 'Startovní listina', kopii: 1 },
  { nazev: 'Rošty Q1', kopii: 4 },
  { nazev: 'Rošty Q2', kopii: 4 },
  { nazev: 'Rošty Q3', kopii: 4 },
  { nazev: 'Rošty finále', kopii: 4 },
  { nazev: 'Výsledky finále', kopii: 1 },
]

interface Props {
  kategorie: Kategorie[]
  onClose: () => void
  onToast: (zprava: string) => void
}

export function TiskovyPresetModal({ kategorie, onClose, onToast }: Props): React.JSX.Element {
  const [vybrane, setVybrane] = useState<Set<number>>(new Set(kategorie.map((k) => k.id)))
  const [probiha, setProbiha] = useState(false)

  const prepni = (id: number): void => {
    setVybrane((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const vse = vybrane.size === kategorie.length
  const prepniVse = (): void =>
    setVybrane(vse ? new Set() : new Set(kategorie.map((k) => k.id)))

  const tiskni = async (): Promise<void> => {
    if (vybrane.size === 0 || probiha) return
    setProbiha(true)
    try {
      const res = await window.api.printPreset([...vybrane])
      if (res.ok) {
        const zprava =
          res.preskoceno > 0
            ? `Vytištěno ${res.vytisteno} úloh · přeskočeno ${res.preskoceno} listů (chybějící data).`
            : `Vytištěno ${res.vytisteno} tiskových úloh.`
        onToast(zprava)
        onClose()
      } else {
        onToast(res.chyba ?? 'Tisk se nezdařil.')
      }
    } finally {
      setProbiha(false)
    }
  }

  return (
    <Modal
      title="Závodní tisk"
      width={480}
      onClose={onClose}
      footer={
        <>
          <Btn variant="plain" onClick={onClose} disabled={probiha}>
            Zrušit
          </Btn>
          <Btn
            variant="primary"
            icon={<FileLetterP />}
            onClick={() => void tiskni()}
            disabled={probiha || vybrane.size === 0}
          >
            {probiha ? 'Tisknu…' : 'Tisknout'}
          </Btn>
        </>
      }
    >
      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'color-mix(in srgb, var(--color-foreground) 55%, transparent)', lineHeight: 1.5 }}>
        Vytiskne standardní sadu listin na výchozí tiskárnu. Listy bez dat se přeskočí.
      </p>

      {/* Kategorie */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 560 }}>Kategorie ({vybrane.size})</span>
        <Button variant="ghost" size="sm" onPress={prepniVse}>
          {vse ? 'Zrušit výběr' : 'Vybrat vše'}
        </Button>
      </div>
      <div
        style={{
          maxHeight: 160,
          overflowY: 'auto',
          border: '0.5px solid var(--color-border)',
          borderRadius: 6,
          marginBottom: 18
        }}
      >
        {kategorie.map((k, i) => (
          <label
            key={k.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 12px',
              fontSize: 13,
              cursor: 'pointer',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border)'
            }}
          >
            <input
              type="checkbox"
              checked={vybrane.has(k.id)}
              onChange={() => prepni(k.id)}
              style={{ accentColor: 'var(--color-primary)', width: 15, height: 15 }}
            />
            <span style={{ fontWeight: 540 }}>{k.nazev}</span>
            <span style={{ marginLeft: 'auto', color: 'color-mix(in srgb, var(--color-foreground) 35%, transparent)', fontSize: 12 }}>
              {k.pocet} jezdců
            </span>
          </label>
        ))}
      </div>

      {/* Přehled presetu */}
      <div style={{ fontSize: 12.5, fontWeight: 560, marginBottom: 8 }}>
        Bude vytištěno (na kategorii):
      </div>
      <div
        style={{
          border: '0.5px solid var(--color-border)',
          borderRadius: 6,
          overflow: 'hidden'
        }}
      >
        {PRESET_POLOZKY.map((p, i) => (
          <div
            key={p.nazev}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              fontSize: 12.5,
              borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border)',
              background: i % 2 === 0 ? 'transparent' : 'color-mix(in srgb, var(--color-foreground) 4%, transparent)'
            }}
          >
            <span>{p.nazev}</span>
            <span
              style={{
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 600,
                color: p.kopii > 1 ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-foreground) 55%, transparent)'
              }}
            >
              {p.kopii}×
            </span>
          </div>
        ))}
      </div>
    </Modal>
  )
}
