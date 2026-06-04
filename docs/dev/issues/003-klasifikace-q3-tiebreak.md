# Issue 003 — Klasifikace po Q3: správný tiebreak při shodě bodů

## Stav

Plánováno.

## Cíl

Opravit řazení v `Klasifikace po Q3`, pokud mají jezdci stejný počet bodů.

Požadavek ze screenshotu:

```text
Při shodě bodů rozhoduje lepší Q3, potom lepší Q2, potom lepší Q1.
```

## Kontext pravidel

Referenční PDF `docs/user/Predpisy-RAC-race-2026.pdf` řeší kvalifikace od strany 10, bod 13.7. Pro Q3 rošt zmiňuje řazení podle součtu bodů Q1+Q2 a při shodě výsledek Q2. Pro průběžnou klasifikaci po kvalifikaci uvádí, že při shodě bodů rozhodují lepší umístění v kvalifikacích a při stejnosti lepší umístění v poslední kvalifikaci.

Pro aplikaci je potřeba sjednotit implementaci s požadavkem obsluhy:

- `class_q2`: při shodě rozhoduje Q2, potom Q1,
- `class_q3`: při shodě rozhoduje Q3, potom Q2, potom Q1.

## Podezření na současný problém

Současná logika pravděpodobně porovnává seřazený seznam bodů z jízd lexikograficky bez zachování toho, ze které série body pochází. To může způsobit špatné pořadí, když mají jezdci stejný součet, ale pravidlově má rozhodovat poslední relevantní kvalifikace.

Příklad:

```text
Jezdec A: Q1 50, Q2 45, Q3 40 = 135
Jezdec B: Q1 40, Q2 45, Q3 50 = 135
```

Správně pro `Klasifikace po Q3`:

```text
B před A, protože B má lepší Q3.
```

## MVP rozsah

### Musí být

- Opravit tiebreak pro STANDARD/RAC/RX klasifikace.
- `Klasifikace po Q2`: při shodě `celkem` řadit podle Q2, potom Q1.
- `Klasifikace po Q3`: při shodě `celkem` řadit podle Q3, potom Q2, potom Q1.
- Zachovat Šotolina ruleset, pokud má jiné tiebreak pravidlo.
- Přidat automatické testy pro shody bodů.

### Nemusí být v MVP

- UI indikace důvodu tiebreaku.
- Ruční přepis pořadí klasifikace.
- Změna bodování.

## Navržený technický postup

### 1. Upravit datový model výpočtu klasifikace

Místo pouhého seřazeného pole bodů uchovávat body podle konkrétní série:

```ts
interface KlasifikaceTmp {
  perKolo: Record<KoloTyp, number>
  celkem: number
}
```

### 2. Přidat tiebreak funkci podle zadaných kol

```ts
function tiebreakStandardPerKolo(
  a: Record<string, number>,
  b: Record<string, number>,
  koloTypy: KoloTyp[]
): number {
  for (const typ of [...koloTypy].reverse()) {
    const av = a[typ] ?? 0
    const bv = b[typ] ?? 0
    if (av !== bv) return bv - av
  }
  return 0
}
```

Pro `['Q1', 'Q2', 'Q3']` tedy porovnává `Q3 → Q2 → Q1`.

### 3. Testovací scénáře

- Stejný součet po Q2, rozhoduje Q2.
- Stejný součet po Q2 i Q2, rozhoduje Q1.
- Stejný součet po Q3, rozhoduje Q3.
- Stejný součet po Q3 i Q3, rozhoduje Q2.
- Stejný součet po Q3/Q2, rozhoduje Q1.
- Šotolina zůstává podle svého pravidla.

## Akceptační kritéria

- `Klasifikace po Q3` řadí jezdce se shodnými body podle Q3, potom Q2, potom Q1.
- `Klasifikace po Q2` řadí jezdce se shodnými body podle Q2, potom Q1.
- Oprava se projeví v UI i PDF exportu.
- Oprava se projeví i v navazujícím nasazení Q3/finále, pokud používá klasifikaci.
- Existují automatické testy tiebreaku.

## Otevřené otázky

- Má se u úplné shody po Q3/Q2/Q1 použít los, startovní číslo, nebo stabilní původní pořadí?
- Má UI zobrazovat pomocný sloupec/důvod tiebreaku?
- Má se přesně implementovat formulace z PDF o počtu prvních/druhých míst, nebo obsluhou požadované pořadí Q3 → Q2 → Q1?
