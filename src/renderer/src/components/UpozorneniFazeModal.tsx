import type { UpozorneniPrechod } from '@shared/stav'
import { Modal } from './Modal'
import { Btn } from './ui'

interface UpozorneniFazeModalProps {
  cilovaFazeLabel: string
  upozorneni: UpozorneniPrechod
  onPokracovat: () => void
  onZrusit: () => void
}

export function UpozorneniFazeModal({
  cilovaFazeLabel,
  upozorneni,
  onPokracovat,
  onZrusit
}: UpozorneniFazeModalProps): React.JSX.Element {
  return (
    <Modal
      title="Neúplné výsledky"
      width={480}
      onClose={onZrusit}
      footer={
        <>
          <Btn variant="plain" onClick={onZrusit}>
            Vrátit se doplnit
          </Btn>
          <Btn variant="primary" onClick={onPokracovat}>
            Přesto pokračovat
          </Btn>
        </>
      }
    >
      <p style={{ margin: '0 0 10px', fontSize: 13.5, lineHeight: 1.55 }}>
        Před přechodem do <b>{cilovaFazeLabel}</b> nejsou u všech jezdců vyplněné časy nebo stavy
        (DNF/DNS/DQ) v předchozích kolech:
      </p>
      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          fontSize: 13,
          lineHeight: 1.55,
          color: 'var(--text-2)'
        }}
      >
        {upozorneni.zpravy.map((z, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {z}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
