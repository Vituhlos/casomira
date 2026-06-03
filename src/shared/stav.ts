/** Stav kola/fáze v přehledu závodu. */
export type StavFaze = 'empty' | 'partial' | 'done'

export interface StavJizdyPrehled {
  jizdaId: number
  cislo: number
  kompletni: boolean
  chybi: number
  celkem: number
}
