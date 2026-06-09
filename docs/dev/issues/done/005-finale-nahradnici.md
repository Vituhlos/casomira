# Issue 005 — Rošt finále: doplnit náhradníky

## Stav

**Hotovo** — vydáno v `0.9.8-beta` (CHANGELOG: Náhradníci ve finále automaticky do roštu). Poznámka: náhradníci se zapisují automaticky, ne ručně jak plánoval původní MVP.

## Cíl

Doplnit do návrhu/generování roštu finále seznam náhradníků.

Požadavek ze screenshotu:

```text
Rošt na finále — chybí náhradníci
```

## Kontext pravidel

Referenční PDF `docs/user/Predpisy-RAC-race-2026.pdf` popisuje finále na straně 11, bod 13.9: do finále je připuštěno 10 vozidel, pozice jsou přidělené od pole position a pokud jezdec nenastoupí, ostatní se posunou dopředu. Z provozního pohledu je proto potřeba znát náhradníky, kteří mohou nastoupit při absenci finalisty.

## MVP rozsah

### Musí být

- V návrhu roštu finále zobrazit nejen finalisty, ale i náhradníky.
- Náhradníci se určí podle pořadí po Q3 za hranicí finále, po aplikaci kvalifikační podmínky.
- Pokud se koná semifinále, náhradníci se určí podle celkového pořadí nepostupujících semifinalistů / kvalifikace podle pravidel.
- Náhradníci nebudou automaticky zapsáni do finálové jízdy jako startující, dokud je operátor ručně nepotvrdí.
- PDF roštu finále může zobrazit sekci `Náhradníci`, pokud existují.

### Nemusí být v MVP

- Automatická výměna finalisty za náhradníka při DNS.
- Více úrovní náhradníků podle různých seriálů.
- Samostatná evidence potvrzení náhradníka.

## Navržený technický postup

### 1. Rozšířit návratový typ roštu

Doplnit volitelné pole:

```ts
interface RostNavrh {
  // existující pole
  nahradnici?: Jezdec[]
}
```

Nebo vytvořit specializovaný typ pro závěrečné rošty:

```ts
interface ZaverecnyRostNavrh extends RostNavrh {
  nahradnici: Jezdec[]
}
```

### 2. Přímé finále bez semifinále

Postup:

1. Vzít kvalifikované pořadí po Q3.
2. Prvních `N` jezdců jde do finále.
3. Další jezdci jsou náhradníci v pořadí.

```ts
const finaliste = kval.slice(0, N)
const nahradnici = kval.slice(N)
```

### 3. Finále po semifinále

Postup je potřeba sladit s pravidly:

- finalisté = postupující ze SF,
- náhradníci = nepostupující semifinalisté seřazení podle umístění v SF a při shodě podle pořadí po Q3,
- případně další kvalifikovaní podle pořadí po Q3.

### 4. UI

V obrazovce finále zobrazit:

```text
Finále
1. jezdec...
...
10. jezdec...

Náhradníci
N1. jezdec...
N2. jezdec...
N3. jezdec...
```

U náhradníka přidat akci:

```text
[Dosadit do finále]
```

### 5. PDF

PDF `Rošty finále` doplní pod hlavní tabulku sekci:

```text
Náhradníci
1. ...
2. ...
```

## Akceptační kritéria

- Návrh finále ukáže finalisty i náhradníky.
- Náhradníci jsou ve správném pořadí podle Q3/SF logiky.
- Náhradníci nejsou automaticky startující ve finále.
- Operátor vidí náhradníky před zápisem roštu.
- PDF roštu finále obsahuje náhradníky, pokud existují.

## Otevřené otázky

- Kolik náhradníků zobrazovat/tisknout?
- Má být náhradník automaticky dosazen při označení finalisty jako DNS?
- Jak přesně řadit náhradníky po semifinále při stejné pozici v obou SF?
- Mají se náhradníci ukládat do databáze, nebo jen počítat dynamicky?
