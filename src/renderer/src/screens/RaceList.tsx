import type { ZavodInfo } from '@shared/types'
import { Btn, DevBadge } from '../components/ui'
import { Icon } from '../components/Icon'
import type { Theme } from '../hooks/useTheme'

function czDate(iso: string): string {
  const parts = iso.split('-').map(Number)
  if (parts.length !== 3) return iso
  const [y, m, d] = parts
  return `${d}. ${m}. ${y}`
}

interface RaceListProps {
  zavody: ZavodInfo[]
  onOpen: (id: number) => void
  onNew: () => void
  onEdit: (z: ZavodInfo) => void
  onDelete: (z: ZavodInfo) => void
  onBackup: (z: ZavodInfo) => void
  onRestore: () => void
  theme: Theme
  onToggleTheme: () => void
}

export function RaceList({
  zavody,
  onOpen,
  onNew,
  onEdit,
  onDelete,
  onBackup,
  onRestore,
  theme,
  onToggleTheme
}: RaceListProps): React.JSX.Element {
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--content-bg)' }}>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '44px 28px 60px' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 26
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text-1)'
              }}
            >
              Závody
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--text-2)' }}>
              Vyber závod a vstup do něj, nebo založ nový.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Btn variant="bezel" icon="import" onClick={onRestore} title="Obnovit ze zálohy">
              Obnovit…
            </Btn>
            <Btn
              variant="bezel"
              icon={theme === 'dark' ? 'sun' : 'moon'}
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
            />
            <Btn variant="primary" icon="flag" onClick={onNew}>
              Nový závod
            </Btn>
          </div>
        </header>

        {zavody.length === 0 ? (
          <div
            style={{
              border: '1px dashed var(--hairline)',
              borderRadius: 'var(--r-card)',
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--text-3)',
              fontSize: 14
            }}
          >
            Zatím žádný závod. Začni tlačítkem <b>Nový závod</b> vpravo nahoře.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16
            }}
          >
            {zavody.map((z) => (
              <div
                key={z.id}
                className="race-card"
                onClick={() => onOpen(z.id)}
                style={{
                  position: 'relative',
                  background: 'var(--card)',
                  border: '0.5px solid var(--hairline)',
                  borderRadius: 'var(--r-card)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '16px 16px 14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: 20,
                        padding: '0 8px',
                        borderRadius: 'var(--r-ctrl)',
                        fontSize: 11,
                        fontWeight: 650,
                        letterSpacing: '0.03em',
                        background: 'var(--seg-track)',
                        color: 'var(--text-2)'
                      }}
                    >
                      {z.typ === 'RX' ? 'RX CUP' : 'RAC RACE'}
                    </span>
                    {z.typ === 'RX' && <DevBadge />}
                  </span>
                  <div className="race-card-actions" style={{ display: 'flex', gap: 2 }}>
                    <button
                      className="icon-btn"
                      title="Zálohovat závod"
                      onClick={(e) => {
                        e.stopPropagation()
                        onBackup(z)
                      }}
                      style={{ width: 26, height: 26, display: 'grid', placeItems: 'center' }}
                    >
                      <Icon name="import" size={15} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Upravit údaje"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(z)
                      }}
                      style={{ width: 26, height: 26, display: 'grid', placeItems: 'center' }}
                    >
                      <Icon name="pencil" size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Smazat závod"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(z)
                      }}
                      style={{ width: 26, height: 26, display: 'grid', placeItems: 'center' }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    margin: '12px 0 2px',
                    fontSize: 17,
                    fontWeight: 640,
                    color: 'var(--text-1)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.25
                  }}
                >
                  {z.nazev}
                </div>
                <div className="tnum" style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
                  {czDate(z.datum)}
                  {z.misto ? ` · ${z.misto}` : ''}
                </div>
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '0.5px solid var(--divider)',
                    fontSize: 12,
                    color: 'var(--text-3)'
                  }}
                >
                  {z.pocetKategorii} kategorií · {z.pocetJezdcu} jezdců
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
