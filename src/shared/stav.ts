import type { KoloTyp, RaceType, Ruleset } from './types'

/** Stav kola/fáze v přehledu závodu. */
export type StavFaze = 'empty' | 'partial' | 'done'

export interface StavJizdyPrehled {
  jizdaId: number
  cislo: number
  kompletni: boolean
  chybi: number
  celkem: number
}

export interface StavKolaPrehled {
  typ: KoloTyp
  stav: StavFaze
  jizdy: StavJizdyPrehled[]
}

export interface StavKategoriePrehled {
  kategorieId: number
  nazev: string
  ruleset: Ruleset
  faze: { id: string; label: string; stav: StavFaze }[]
  kola: StavKolaPrehled[]
}

export interface PrehledZavodu {
  zavodId: number
  typ: RaceType
  kategorie: StavKategoriePrehled[]
}

export interface UpozorneniPrechod {
  /** Krátké řádky pro dialog (např. „Q2 — 2. jízda: chybí 1 jezdec"). */
  zpravy: string[]
}
