import { useState } from 'react'
import type { BackupCollisionMatch, BackupRestorePreview } from '@shared/backup'
import { ArrowDownToSquare } from '@gravity-ui/icons'
import { Modal } from './Modal'
import { Btn } from './ui'

function czDate(iso: string): string {
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3) return iso
  const [y, m, d] = parts
  return `${d}. ${m}. ${y}`
}

interface RestoreBackupModalProps {
  preview: BackupRestorePreview
  onClose: () => void
  onDone: (zavodId: number) => void
  onToast: (zprava: string) => void
}

export function RestoreBackupModal({
  preview,
  onClose,
  onDone,
  onToast
}: RestoreBackupModalProps): React.JSX.Element {
  const [probiha, setProbiha] = useState(false)
  const [overwriteId, setOverwriteId] = useState<number | null>(
    preview.kolize.length === 1 ? preview.kolize[0].id : null
  )

  const multi = preview.pocetZavodu > 1 && preview.scope === 'database'
  const maKolizi = preview.kolize.length > 0 && !multi

  const obnovit = async (mode: 'new' | 'overwrite'): Promise<void> => {
    if (probiha) return
    if (mode === 'overwrite' && overwriteId == null) {
      onToast('Vyber závod, který se má přepsat.')
      return
    }
    setProbiha(true)
    try {
      const res = await window.api.restoreBackup({
        soubor: preview.soubor,
        mode,
        targetZavodId: mode === 'overwrite' ? overwriteId ?? undefined : undefined
      })
      if (res.ok && res.zavodId != null) {
        onToast(`Závod „${res.nazev ?? preview.zavod.nazev}" byl obnoven.`)
        onDone(res.zavodId)
      } else if (!res.zruseno) {
        onToast(res.chyba ?? 'Obnova se nezdařila.')
      }
    } finally {
      setProbiha(false)
    }
  }

  return (
    <Modal
      title="Obnovit ze zálohy"
      width={480}
      onClose={onClose}
      footer={
        <>
          <Btn variant="plain" onClick={onClose} disabled={probiha}>
            Zrušit
          </Btn>
          {maKolizi && (
            <Btn
              variant="bezel"
              onClick={() => void obnovit('overwrite')}
              disabled={probiha || overwriteId == null}
            >
              Přepsat existující
            </Btn>
          )}
          <Btn
            variant="primary"
            icon={<ArrowDownToSquare />}
            onClick={() => void obnovit('new')}
            disabled={probiha}
          >
            {multi ? `Obnovit všech ${preview.pocetZavodu} závodů` : 'Obnovit jako nový'}
          </Btn>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>
        <b>{preview.zavod.nazev}</b>
        {multi ? ` (+ ${preview.pocetZavodu - 1} dalších v souboru)` : ''}
        <br />
        <span className="tnum" style={{ color: 'color-mix(in srgb, var(--color-foreground) 55%, transparent)', fontSize: 12.5 }}>
          {czDate(preview.zavod.datum)}
          {preview.zavod.misto ? ` · ${preview.zavod.misto}` : ''} · {preview.pocetKategorii}{' '}
          kategorií · {preview.pocetJezdcu} jezdců
        </span>
      </p>

      {multi && (
        <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'color-mix(in srgb, var(--color-foreground) 55%, transparent)', lineHeight: 1.5 }}>
          Záloha celé databáze: všechny závody v souboru se obnoví jako <b>nové</b> záznamy.
          Ostatní závody v aplikaci zůstanou nedotčené.
        </p>
      )}

      {maKolizi && (
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12.5, color: 'color-mix(in srgb, var(--color-foreground) 55%, transparent)' }}>
            V databázi už existuje shodný závod. Chceš vytvořit kopii, nebo přepsat stávající?
          </p>
          <div
            style={{
              border: '0.5px solid var(--color-border)',
              borderRadius: 6,
              overflow: 'hidden'
            }}
          >
            {preview.kolize.map((k: BackupCollisionMatch, i: number) => (
              <label
                key={k.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  borderTop: i === 0 ? 'none' : '0.5px solid var(--color-border)'
                }}
              >
                <input
                  type="radio"
                  name="kolize-zavod"
                  checked={overwriteId === k.id}
                  onChange={() => setOverwriteId(k.id)}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span>
                  {k.nazev}{' '}
                  <span className="tnum" style={{ color: 'color-mix(in srgb, var(--color-foreground) 35%, transparent)' }}>
                    ({czDate(k.datum)})
                  </span>
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'color-mix(in srgb, var(--color-foreground) 22%, transparent)' }}>
                  {k.duvod === 'source_id' ? 'stejné ID' : 'název + datum'}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'color-mix(in srgb, var(--color-foreground) 22%, transparent)', lineHeight: 1.45 }}>
        Záloha: app {preview.appVersion}, schéma {preview.schemaVersion} · export{' '}
        {new Date(preview.exportedAt).toLocaleString('cs-CZ')}
      </p>
    </Modal>
  )
}
