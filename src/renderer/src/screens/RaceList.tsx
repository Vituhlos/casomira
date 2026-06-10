import type { ZavodInfo } from '@shared/types'
import { Card, Button, Chip } from '@heroui/react'
import { DevBadge } from '../components/ui'
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
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--background)' }}>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '44px 28px 60px' }}>

        {/* ---- Záhlaví stránky ---- */}
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
                color: 'var(--foreground)'
              }}
            >
              Závody
            </h1>
            <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--muted)' }}>
              Vyber závod a vstup do něj, nebo založ nový.
            </p>
          </div>

          {/* Tlačítka vpravo — HeroUI Button */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button
              variant="tertiary"
              size="sm"
              onPress={onRestore}
              aria-label="Obnovit ze zálohy"
            >
              <Icon name="import" size={14} />
              Obnovit…
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              isIconOnly
              onPress={onToggleTheme}
              aria-label={theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
            </Button>
            <Button
              size="sm"
              onPress={onNew}
            >
              <Icon name="flag" size={14} />
              Nový závod
            </Button>
          </div>
        </header>

        {/* ---- Prázdný stav ---- */}
        {zavody.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
            style={{
              border: '1.5px dashed var(--border)',
              borderRadius: 'var(--r-card)',
            }}
          >
            {/* Ikona */}
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'var(--surface-secondary)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--muted)'
              }}
            >
              <Icon name="flag" size={22} />
            </div>
            {/* Text */}
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--foreground)' }}>
                Žádné závody
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--muted)' }}>
                Zatím tady nic není. Založ první závod a začni měřit.
              </p>
            </div>
            {/* Přímé tlačítko */}
            <Button size="sm" onPress={onNew}>
              <Icon name="flag" size={14} />
              Nový závod
            </Button>
          </div>
        ) : (
          /* ---- Mřížka karet ---- */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16
            }}
          >
            {zavody.map((z) => (
              <Card
                key={z.id}
                className="race-card cursor-pointer gap-0 p-0"
                style={{
                  background: 'var(--surface)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--r-card)',
                  boxShadow: 'var(--shadow-card)'
                }}
                onClick={() => onOpen(z.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onOpen(z.id)
                }}
              >
                <Card.Content className="p-0" style={{ padding: '16px 16px 14px' }}>

                  {/* Horní řada: odznak typu + akce */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {/* HeroUI Chip s barvami z mac.css — pill tvar je OK pro status badge */}
                      <Chip
                        size="sm"
                        className="border-transparent font-[650] tracking-[0.04em]"
                        style={{
                          height: 20,
                          fontSize: 11,
                          background: z.typ === 'RX' ? 'var(--rx-badge-bg)' : 'var(--rac-badge-bg)',
                          color: z.typ === 'RX' ? 'var(--rx-badge-text)' : 'var(--rac-badge-text)'
                        }}
                      >
                        {z.typ === 'RX' ? 'RX CUP' : 'RAC RACE'}
                      </Chip>
                      {z.typ === 'RX' && <DevBadge />}
                    </span>

                    {/* Akce na kartě — původní icon-btn (bez HeroUI, protože stopPropagation funguje spolehlivě) */}
                    <div className="race-card-actions" style={{ display: 'flex', gap: 2 }}>
                      <button
                        className="border-none bg-transparent text-[var(--muted)] cursor-pointer rounded-[6px] transition-[background,color] duration-[130ms] ease-linear hover:bg-black/[.06] dark:hover:bg-white/[.1] hover:text-[var(--foreground)] active:bg-black/[.11] dark:active:bg-white/[.16] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_38%,transparent)]"
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
                        className="border-none bg-transparent text-[var(--muted)] cursor-pointer rounded-[6px] transition-[background,color] duration-[130ms] ease-linear hover:bg-black/[.06] dark:hover:bg-white/[.1] hover:text-[var(--foreground)] active:bg-black/[.11] dark:active:bg-white/[.16] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_38%,transparent)]"
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
                        className="border-none bg-transparent text-[var(--muted)] cursor-pointer rounded-[6px] transition-[background,color] duration-[130ms] ease-linear hover:bg-black/[.06] dark:hover:bg-white/[.1] hover:text-[var(--foreground)] active:bg-black/[.11] dark:active:bg-white/[.16] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_38%,transparent)]"
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

                  {/* Název závodu */}
                  <div
                    style={{
                      margin: '11px 0 3px',
                      fontSize: 18,
                      fontWeight: 660,
                      color: 'var(--foreground)',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.25
                    }}
                  >
                    {z.nazev}
                  </div>

                  {/* Datum a místo */}
                  <div
                    className="tnum"
                    style={{ fontSize: 12.5, color: 'var(--muted)', letterSpacing: '-0.005em' }}
                  >
                    {czDate(z.datum)}
                    {z.misto ? ` · ${z.misto}` : ''}
                  </div>

                  {/* Statistiky (kategorie, jezdci) */}
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '0.5px solid var(--separator)',
                      fontSize: 12.5,
                      color: 'var(--muted)',
                      display: 'flex',
                      gap: 12
                    }}
                  >
                    <span>
                      {z.pocetKategorii}{' '}
                      {z.pocetKategorii === 1 ? 'kategorie' : 'kategorií'}
                    </span>
                    <span style={{ color: 'var(--separator)' }}>·</span>
                    <span>
                      {z.pocetJezdcu}{' '}
                      {z.pocetJezdcu === 1 ? 'jezdec' : z.pocetJezdcu < 5 ? 'jezdci' : 'jezdců'}
                    </span>
                  </div>

                </Card.Content>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
