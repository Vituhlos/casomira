import { useState } from 'react'
import { Button, Dropdown, Input, Label, Table, TextField } from '@heroui/react'
import { useTheme } from '../hooks/useTheme'
import { StavBadge, MedalDot, EditableCell, PhaseSegment } from '../ui'

/**
 * DevKit — kitchen-sink design systému (plan-heroui-native.md, Fáze 2).
 * Otevření: v DevTools `location.hash = 'kit'; location.reload()`.
 *
 * Slouží jako vizuální kontrakt theme tokenů a HLAVNĚ jako gate prototyp
 * editovatelné HeroUI Table (inline editace, dvojklik cyklus stavů, zebra)
 * — ověřit DŘÍV, než na Table stojí celá appka.
 */

type Stav = 'OK' | 'DNF' | 'DNS' | 'DQ'

interface DemoRow {
  id: number
  stCislo: number
  jmeno: string
  casMs: number | null
  stav: Stav
}

const DEMO_ROWS: DemoRow[] = [
  { id: 1, stCislo: 14, jmeno: 'Novák Petr', casMs: 83456, stav: 'OK' },
  { id: 2, stCislo: 7, jmeno: 'Svoboda Jan', casMs: 84102, stav: 'OK' },
  { id: 3, stCislo: 23, jmeno: 'Dvořák Milan', casMs: 85890, stav: 'OK' },
  { id: 4, stCislo: 91, jmeno: 'Černý Tomáš', casMs: null, stav: 'DNF' },
  { id: 5, stCislo: 5, jmeno: 'Procházka Karel', casMs: null, stav: 'DNS' },
  { id: 6, stCislo: 42, jmeno: 'Kučera Pavel', casMs: 87013, stav: 'OK' }
]

const STAVY: Stav[] = ['OK', 'DNF', 'DNS', 'DQ']

const PHASES = [
  'Startovní listina',
  'Q1 rošty',
  'Q1 výsledky',
  'Q2 rošty',
  'Q2 výsledky',
  'Po Q2',
  'Q3 rošty',
  'Q3 výsledky',
  'Po Q3',
  'Semifinále',
  'Finále',
  'Celkově'
]


function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted uppercase">{title}</h2>
      {children}
    </section>
  )
}

function Swatch({ label, cls }: { label: string; cls: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-8 shrink-0 rounded-md border border-border ${cls}`} />
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

export function DevKit(): React.JSX.Element {
  const { theme, toggle } = useTheme()
  const [rows, setRows] = useState<DemoRow[]>(DEMO_ROWS)

  const update = (id: number, patch: Partial<DemoRow>): void =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  // Pořadí podle času (OK first), pro medailové puntíky
  const ranked = [...rows]
    .filter((r) => r.stav === 'OK' && r.casMs != null)
    .sort((a, b) => a.casMs! - b.casMs!)
  const rankOf = (id: number): number => ranked.findIndex((r) => r.id === id) + 1

  return (
    <div className="min-h-screen bg-background p-8 font-sans text-[13px] text-foreground">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Verdict DevKit</h1>
          <p className="text-muted">
            Kitchen-sink HeroUI theme — vizuální kontrakt (Fáze 2)
          </p>
        </div>
        <Button variant="secondary" onPress={toggle}>
          {theme === 'dark' ? 'Světlý režim' : 'Tmavý režim'}
        </Button>
      </header>

      <Section title="Tokeny — HeroUI defaults">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          <Swatch label="background" cls="bg-background" />
          <Swatch label="surface" cls="bg-surface" />
          <Swatch label="surface-secondary" cls="bg-surface-secondary border border-border" />
          <Swatch label="accent" cls="bg-accent" />
          <Swatch label="default" cls="bg-default" />
          <Swatch label="muted" cls="bg-muted" />
          <Swatch label="border" cls="bg-border" />
          <Swatch label="warning" cls="bg-warning" />
          <Swatch label="danger" cls="bg-danger" />
        </div>
      </Section>

      <Section title="Tokeny — app-specific (verdict.css)">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          <Swatch label="medal-gold" cls="bg-medal-gold" />
          <Swatch label="medal-silver" cls="bg-medal-silver" />
          <Swatch label="medal-bronze" cls="bg-medal-bronze" />
        </div>
      </Section>

      <Section title="Tlačítka">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Uložit PDF</Button>
          <Button variant="secondary">Stopky</Button>
          <Button variant="tertiary">Tertiary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Smazat</Button>
          <Button isDisabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Stavy a medaile">
        <div className="flex flex-wrap items-center gap-4">
          <StavBadge stav="DNF" />
          <StavBadge stav="DNS" />
          <StavBadge stav="DQ" />
          <span className="flex items-center">
            <MedalDot rank={1} /> 1. místo
          </span>
          <span className="flex items-center">
            <MedalDot rank={2} /> 2. místo
          </span>
          <span className="flex items-center">
            <MedalDot rank={3} /> 3. místo
          </span>
          <span className="tabular-nums">01:23.456 (tabular-nums)</span>
        </div>
      </Section>

      <Section title="PhaseSegment (overflow-x test)">
        <div className="max-w-2xl">
          <PhaseSegment
            phases={PHASES.map((p) => ({ id: p, label: p }))}
            selectedId={PHASES[0]}
            onSelect={() => {}}
          />
        </div>
      </Section>

      <Section title="Formulářové pole">
        <div className="flex max-w-md flex-col gap-4">
          <TextField>
            <Label>Název závodu</Label>
            <Input placeholder="Autokros Přerov" />
          </TextField>
        </div>
      </Section>

      <Section title="GATE: editovatelná tabulka (HeroUI Table)">
        <p className="mb-3 text-muted">
          Checklist: klik do času → editace, Enter potvrdí, Esc vrátí, špatný formát červeně,
          klik na stav → Dropdown OK/DNF/DNS/DQ, zebra, šipky vs. input.
        </p>
        <Table className="max-w-3xl">
          <Table.ScrollContainer>
            <Table.Content aria-label="Výsledky — demo">
              <Table.Header>
                <Table.Column className="w-16">Pořadí</Table.Column>
                <Table.Column className="w-20">St. č.</Table.Column>
                <Table.Column isRowHeader>Jméno</Table.Column>
                <Table.Column className="w-36 text-right">Čas</Table.Column>
                <Table.Column className="w-24">Stav</Table.Column>
              </Table.Header>
              <Table.Body>
                {rows.map((r, i) => {
                  const rank = r.stav === 'OK' ? rankOf(r.id) : 0
                  return (
                    <Table.Row key={r.id} className={i % 2 ? 'bg-surface-secondary' : ''}>
                      <Table.Cell className="tabular-nums">
                        {rank > 0 ? (
                          <>
                            <MedalDot rank={rank} />
                            {rank}.
                          </>
                        ) : (
                          '—'
                        )}
                      </Table.Cell>
                      <Table.Cell className="tabular-nums">{r.stCislo}</Table.Cell>
                      <Table.Cell>{r.jmeno}</Table.Cell>
                      <EditableCell
                        casMs={r.casMs}
                        onCommit={(ms) => update(r.id, { casMs: ms })}
                      />
                      <Table.Cell>
                        <Dropdown>
                          <Dropdown.Trigger>
                            <Button variant="ghost" size="sm" className="h-auto min-w-0 px-1 py-0.5">
                              {r.stav === 'OK'
                                ? <span className="text-muted text-xs">OK</span>
                                : <StavBadge stav={r.stav} />}
                            </Button>
                          </Dropdown.Trigger>
                          <Dropdown.Popover>
                            <Dropdown.Menu onAction={(key) => update(r.id, { stav: key as Stav })}>
                              {STAVY.map((s) => (
                                <Dropdown.Item key={s} id={s} textValue={s}>
                                  <Label>{s}</Label>
                                </Dropdown.Item>
                              ))}
                            </Dropdown.Menu>
                          </Dropdown.Popover>
                        </Dropdown>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Section>
    </div>
  )
}
