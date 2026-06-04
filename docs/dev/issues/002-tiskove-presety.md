# Issue 002 — Tiskové presety a počty kopií

## Stav

Plánováno.

## Cíl

Doplnit do aplikace rychlý tiskový preset pro běžný závodní workflow ze screenshotu:

```text
Tisk — Startovní listina 1×, Rošty 4×, Výsledky finále 1×
```

Cílem není nahradit PDF export, ale přidat rychlou volbu pro opakovaný tisk vybraných listů s přednastaveným počtem kopií.

## Kontext

Aplikace už umí exportovat jednotlivé PDF listy a hromadný export všech listů. Pro provoz v den závodu ale operátor potřebuje rychle vytisknout jen vybrané dokumenty a některé z nich ve více kopiích.

Typický požadavek:

- Startovní listina: 1 kopie,
- Rošty: 4 kopie,
- Výsledky finále: 1 kopie.

## MVP rozsah

### Musí být

- Přidat jeden pevný tiskový preset `Závodní tisk`.
- Preset umožní vybrat kategorii nebo více kategorií.
- Preset vytiskne:
  - `start` 1×,
  - dostupné rošty kvalifikací a finále 4×,
  - výsledky finále 1×.
- Před tiskem zobrazit souhrn, co se bude tisknout.
- Přeskočit listy, které pro danou kategorii nedávají smysl nebo nejsou dostupné.
- Vrátit jasný výsledek: počet vytištěných dokumentů / přeskočených dokumentů / chyb.

### Nemusí být v MVP

- Uživatelsky editovatelné presety.
- Tisk všech typů výsledků.
- Automatické rozhodování podle fáze závodu.
- Fronta tisku.

## Navržený technický postup

### 1. Definovat tiskový preset

Přidat interní konfiguraci:

```ts
type PrintPresetKey = 'race_basic'

interface PrintPresetItem {
  listKey: ListKey
  copies: number
}

const RACE_BASIC_PRINT_PRESET: PrintPresetItem[] = [
  { listKey: 'start', copies: 1 },
  { listKey: 'grid_q1', copies: 4 },
  { listKey: 'grid_q2', copies: 4 },
  { listKey: 'grid_q3', copies: 4 },
  { listKey: 'final_rost', copies: 4 },
  { listKey: 'final_res', copies: 1 }
]
```

Pro Šotolinu bude potřeba mapovat finále na `final_a_rost`, `final_a_res`, případně `final_b_rost`, `final_b_res`.

### 2. Rozšířit PDF/tiskovou službu

Doplnit funkci, která umí stejný list vytisknout vícekrát:

```ts
printPreset(kategorieIds: number[], preset: PrintPresetKey): Promise<PrintPresetResult>
```

Důležité je nerozbít existující PDF export. Tiskový preset má být samostatná funkce vedle exportu.

### 3. IPC a preload

Přidat metodu do `window.api`:

```ts
printPreset(kategorieIds: number[], preset: PrintPresetKey): Promise<PrintPresetResult>
```

### 4. UI

V Nastavení nebo u PDF menu přidat položku:

```text
Tiskový preset…
```

Modal:

```text
Tiskový preset: Závodní tisk

Kategorie:
[x] N1600
[x] N1600+
[ ] Šotolina

Bude vytištěno:
- Startovní listina 1×
- Rošty Q1 4×
- Rošty Q2 4×
- Rošty Q3 4×
- Rošty finále 4×
- Výsledky finále 1×

[Tisknout]
```

## Akceptační kritéria

- Operátor umí spustit tiskový preset z UI.
- Před tiskem vidí přesný seznam listů a počet kopií.
- Rošty se tisknou 4×.
- Startovní listina a výsledky finále se tisknou 1×.
- Pokud list neexistuje nebo není pro kategorii relevantní, aplikace ho přeskočí a oznámí to.
- Existující PDF export zůstane beze změny.

## Otevřené otázky

- Mají se tisknout rošty všech dostupných fází, nebo vždy jen Q1–Q3 + finále?
- Má se pro Šotolinu tisknout Finále A i Finále B?
- Má preset tisknout pro jednu aktivní kategorii, nebo hromadně pro všechny vybrané kategorie?
- Má aplikace tisknout přímo na tiskárnu, nebo nejdřív generovat PDF a pak otevřít systémový tisk?
