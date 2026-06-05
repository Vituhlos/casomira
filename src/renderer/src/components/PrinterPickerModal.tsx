import { useState } from 'react'
import { Modal } from './Modal'
import { Btn } from './ui'

interface Tiskarny {
  name: string
  displayName: string
  isDefault: boolean
}

interface Props {
  tiskarny: Tiskarny[]
  onPrint: (deviceName: string) => void
  onClose: () => void
}

export function PrinterPickerModal({ tiskarny, onPrint, onClose }: Props): React.JSX.Element {
  const defaultName = tiskarny.find((t) => t.isDefault)?.name ?? tiskarny[0]?.name ?? ''
  const [vybrana, setVybrana] = useState(defaultName)

  return (
    <Modal
      title="Vybrat tiskárnu"
      width={360}
      onClose={onClose}
      footer={
        <>
          <Btn variant="plain" onClick={onClose}>
            Zrušit
          </Btn>
          <Btn
            variant="primary"
            icon="printer"
            onClick={() => onPrint(vybrana)}
            disabled={!vybrana}
          >
            Tisknout
          </Btn>
        </>
      }
    >
      <div
        style={{
          border: '0.5px solid var(--hairline)',
          borderRadius: 'var(--r-ctrl)',
          overflow: 'hidden'
        }}
      >
        {tiskarny.map((t, i) => (
          <label
            key={t.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              fontSize: 13,
              cursor: 'pointer',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--divider)',
              background: vybrana === t.name ? 'var(--accent-subtle, color-mix(in srgb, var(--accent) 10%, transparent))' : i % 2 === 0 ? 'transparent' : 'var(--card-alt)'
            }}
          >
            <input
              type="radio"
              name="tiskarny"
              value={t.name}
              checked={vybrana === t.name}
              onChange={() => setVybrana(t.name)}
              style={{ accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0 }}
            />
            <span style={{ fontWeight: vybrana === t.name ? 560 : 440, color: 'var(--text-1)' }}>
              {t.displayName || t.name}
            </span>
            {t.isDefault && (
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-3)' }}>
                výchozí
              </span>
            )}
          </label>
        ))}
      </div>
    </Modal>
  )
}
