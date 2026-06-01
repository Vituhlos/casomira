import type { KoloTyp } from '@shared/types'
import { RostGrid } from './RostGrid'

interface GridsProps {
  kategorieId: number
  typ: KoloTyp
  label: string
}

// Rošty kvalifikace (Q1–Q3). Generování dle pravidel §6 přes navrhniRost; počet
// jízd i los lze ve náhledu měnit. Veškerý vzhled a editace jsou v RostGrid,
// kterou sdílí i Semifinále a Finále.
export function Grids({ kategorieId, typ, label }: GridsProps): React.JSX.Element {
  return (
    <RostGrid
      kategorieId={kategorieId}
      typ={typ}
      label={label}
      navrhFn={(pocetJizd) => window.api.navrhniRost(kategorieId, typ, pocetJizd)}
      allowPocetJizd
      showLos
      showLegenda
      headSub="Zadej startovní číslo · jméno a vůz se doplní · nebo nech rošt vygenerovat"
      generateLabel="Vygenerovat rošt"
    />
  )
}
