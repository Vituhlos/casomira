# Issue 004 — Rošt finále: hlídat kvalifikační podmínku pro postup

## Stav

Plánováno.

## Cíl

Opravit generování roštu finále tak, aby se do finále nedostal jezdec, který nesplnil minimální podmínku účasti v kvalifikačních jízdách.

Požadavek ze screenshotu:

```text
Pokud má jezdec 2× DNS nebo DQ, nesmí do finále.
Musí mít jednu jízdu odjetou a ve druhé alespoň DNF.
```

## Kontext pravidel

Referenční PDF `docs/user/Predpisy-RAC-race-2026.pdf` popisuje kvalifikační jízdy od strany 10, bod 13.7, včetně stavů DNF, DNS a DSQ. Finálové jízdy jsou na straně 11, bod 13.9. PDF výslovně řeší postavení na startu finále podle pořadí po kvalifikačních jízdách nebo podle výsledků semifinále.

Aplikační pravidlo pro MVP:

- jezdec je kvalifikovaný do finále jen pokud:
  - má alespoň jednu kvalifikační jízdu dokončenou jako `OK` s časem,
  - a zároveň má alespoň jednu další kvalifikační jízdu, do které reálně nastoupil, tedy minimálně `DNF`,
  - `DNS` a `DQ/DSQ` se nepočítají jako splnění nástupu.

## MVP rozsah

### Musí být

- Zkontrolovat a případně opravit funkci, která určuje kvalifikované jezdce pro finále.
- Zajistit, že jezdec s kombinací typu `OK + DNS + DNS` není automaticky považován za splněného, pokud pravidlo vyžaduje druhou jízdu alespoň `DNF`.
- Zajistit, že jezdec s `OK + DNF + DNS` kvalifikovaný je.
- Zajistit, že jezdec s `DNF + DNF + DNS` kvalifikovaný není, protože nemá jednu odjetou/dokončenou jízdu.
- Zajistit, že jezdec s `OK + DQ + DNS` kvalifikovaný není, pokud DQ nesplňuje druhý start.
- Použít stejnou kvalifikační filtraci pro přímé finále, semifinále i náhradníky.

### Nemusí být v MVP

- Ruční výjimka ředitele závodu.
- Zvláštní kvalifikační pravidla pro každý seriál.
- UI editor kvalifikačních pravidel.

## Navržený technický postup

### 1. Vyjasnit funkci kvalifikace

Zavést nebo upravit funkci:

```ts
function jeKvalifikovanDoZaveru(stats: {
  dokoncil: number
  odstartovalBezDq: number
}): boolean {
  return stats.dokoncil >= 1 && stats.odstartovalBezDq >= 2
}
```

Kde:

- `dokoncil` = počet Q jízd se stavem `OK` a měřeným časem,
- `odstartovalBezDq` = počet Q jízd se stavem `OK` nebo `DNF`,
- `DNS` a `DQ` se nepočítají.

### 2. Upravit SQL agregaci

Agregace pro kvalifikaci by měla počítat:

```sql
SUM(CASE WHEN stav = 'OK' AND namereny_cas_ms IS NOT NULL THEN 1 ELSE 0 END) AS dokoncil,
SUM(CASE WHEN stav IN ('OK','DNF') THEN 1 ELSE 0 END) AS odstartoval_bez_dq
```

### 3. Testy

Přidat unit testy kombinací:

| Q1 | Q2 | Q3 | Očekávání |
| --- | --- | --- | --- |
| OK | DNF | DNS | kvalifikován |
| OK | DNS | DNS | nekvalifikován |
| OK | DQ | DNS | nekvalifikován |
| DNF | DNF | DNS | nekvalifikován |
| OK | OK | DNS | kvalifikován |
| OK | DNF | DQ | kvalifikován |

## Akceptační kritéria

- Jezdec s 2× DNS nebo kombinací DNS/DQ bez druhého reálného startu se nedostane do roštu finále.
- Jezdec s jednou dokončenou jízdou a druhou jízdou alespoň DNF se do finále může dostat.
- Stejné pravidlo používá finále, semifinále i seznam náhradníků.
- UI zobrazí srozumitelnou informaci, kolik jezdců splnilo podmínku.
- Existují testy pro hraniční kombinace stavů.

## Otevřené otázky

- Má pravidlo platit ze všech tří Q jízd, nebo pouze z prvních dvou?
- Má DQ někdy počítat jako nastoupení podle rozhodnutí ředitele?
- Má být možné ručně přidat jezdce do finále jako výjimku?
