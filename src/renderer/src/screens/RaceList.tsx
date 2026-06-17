import type { ZavodInfo } from '@shared/types'
import { Button, ButtonGroup, Card, Chip, Typography } from '@heroui/react'
import { ArrowDownToSquare, ArrowUpFromSquare, Flag, LayoutCells, Moon, Pencil, Persons, Plus, Sun, TrashBin } from '@gravity-ui/icons'
import type { Theme } from '../hooks/useTheme'
import logoDarkUrl from '../assets/brand/verdict-lockup-dark.svg?url'
import logoLightUrl from '../assets/brand/verdict-lockup-light.svg?url'

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
    <div className="flex h-full flex-col bg-background">
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-6 border-b border-border bg-surface px-6 py-3">
        <div className="h-8">
          <img
            src={logoLightUrl}
            alt="Verdict"
            className="verdict-logo-light h-full w-auto max-w-[200px] object-contain"
          />
          <img
            src={logoDarkUrl}
            alt="Verdict"
            className="verdict-logo-dark h-full w-auto max-w-[200px] object-contain"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ButtonGroup variant="tertiary" size="sm">
            <Button onPress={onRestore}>
              <ArrowUpFromSquare />
              Obnovit…
            </Button>
            <Button
              isIconOnly
              aria-label={theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
              onPress={onToggleTheme}
            >
              <ButtonGroup.Separator />
              {theme === 'dark' ? <Sun /> : <Moon />}
            </Button>
          </ButtonGroup>
          <Button size="sm" onPress={onNew}>
            <Flag />
            Nový závod
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[940px] px-7 pb-16 pt-8">
          <div className="mb-8 flex flex-col gap-1">
            <Typography type="h1">Správa závodů</Typography>
            <Typography type="body-sm" color="muted">autokros · rallycross</Typography>
          </div>
          {zavody.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Flag width={32} height={32} style={{ color: 'var(--color-muted)', opacity: 0.35 }} />
              <Typography type="body-sm" weight="medium">Zatím žádný závod</Typography>
              <Typography type="body-sm" color="muted" className="max-w-[260px]">
                Začni tím, že založíš nový závod nebo obnovíš zálohu.
              </Typography>
              <Button onPress={onNew} className="mt-2">
                <Flag />
                Nový závod
              </Button>
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
            >
              {zavody.map((z) => (
                <Card
                  key={z.id}
                  className="group cursor-pointer transition-[transform,box-shadow] duration-200 motion-reduce:transition-none hover:-translate-y-1 hover:shadow-lg"
                  onClick={() => onOpen(z.id)}
                >
                  <Card.Header className="gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chip size="sm" variant="soft">
                          {z.typ === 'RX' ? 'RX CUP' : 'RAC RACE'}
                        </Chip>
                        {z.typ === 'RX' && (
                          <Chip size="sm" variant="soft" color="warning">
                            Ve vývoji
                          </Chip>
                        )}
                      </div>
                      <div
                        className="-mr-1.5 flex shrink-0 gap-0.5 opacity-0 transition-opacity duration-150 motion-reduce:opacity-100 motion-reduce:transition-none group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          isIconOnly
                          aria-label="Zálohovat závod"
                          onPress={() => onBackup(z)}
                        >
                          <ArrowDownToSquare width={14} height={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          isIconOnly
                          aria-label="Upravit údaje"
                          onPress={() => onEdit(z)}
                        >
                          <Pencil width={14} height={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          isIconOnly
                          aria-label="Smazat závod"
                          onPress={() => onDelete(z)}
                        >
                          <TrashBin width={14} height={14} />
                        </Button>
                      </div>
                    </div>
                    <Typography type="h5">{z.nazev}</Typography>
                    <Typography type="body-sm" color="muted" className="tabular-nums">
                      {czDate(z.datum)}
                      {z.misto ? ` · ${z.misto}` : ''}
                    </Typography>
                  </Card.Header>

                  <Card.Footer className="mt-auto flex items-center gap-3 border-t border-border pt-2.5">
                    <Typography type="body-xs" color="muted" className="flex items-center gap-1">
                      <LayoutCells width={12} height={12} />
                      {z.pocetKategorii} kategorií
                    </Typography>
                    <Typography type="body-xs" color="muted" className="flex items-center gap-1">
                      <Persons width={12} height={12} />
                      {z.pocetJezdcu} jezdců
                    </Typography>
                  </Card.Footer>
                </Card>
              ))}
              <button
                type="button"
                aria-label="Přidat nový závod"
                onClick={onNew}
                className="flex min-h-[120px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm text-muted transition-[border-color,color] duration-150 motion-reduce:transition-none hover:border-foreground hover:text-foreground"
              >
                <Plus width={14} height={14} />
                Nový závod
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
