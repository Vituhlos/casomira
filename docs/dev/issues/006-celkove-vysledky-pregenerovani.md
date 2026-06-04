# Issue 006 — Celkové výsledky: umožnit přegenerování po změnách

## Stav

Plánováno.

## Cíl

Opravit stav, kdy se celkové výsledky po prvním vygenerování nedají znovu přegenerovat po změně výsledků, roštů nebo finále.

Požadavek ze screenshotu:

```text
Celkové výsledky — když se jednou vygeneruje, nejde přegenerovat
```

## Kontext pravidel

Referenční PDF `docs/user/Predpisy-RAC-race-2026.pdf` popisuje finálové jízdy a konečné pořadí na straně 11, bod 13.9. Celkové pořadí je závislé na výsledku finále, případně semifinále a pořadí po kvalifikacích. Pokud se opraví výsledek finále nebo kvalifikace, celkové výsledky se musí dát znovu spočítat.

## MVP rozsah

### Musí být

- Zjistit, kde se celkové výsledky po vygenerování fixují.
- Přidat možnost `Přegenerovat celkové výsledky`.
- Přegenerování musí použít aktuální data:
  - výsledky Q1–Q3,
  - výsledky SF, pokud se koná,
  - výsledky finále,
  - pravidla pro nepostupující jezdce.
- Před přegenerováním zobrazit potvrzení, pokud existují ruční zásahy.
- Přegenerování nesmí smazat audit log penalizací.

### Nemusí být v MVP

- Historie verzí celkových výsledků.
- Export staré a nové verze pro porovnání.
- Automatické přegenerování při každé změně výsledku.

## Navržený technický postup

### 1. Rozlišit výpočet a uložený snapshot

Zkontrolovat, jestli jsou celkové výsledky:

- počítané dynamicky z aktuálních dat,
- nebo uložené jako snapshot v databázi,
- nebo blokované stavem UI.

Podle toho zvolit opravu.

### 2. Přidat explicitní akci přegenerování

UI akce:

```text
[Přegenerovat celkové výsledky]
```

Chování:

- znovu spočítá pořadí,
- aktualizuje zobrazení,
- umožní znovu exportovat PDF,
- zobrazí toast s výsledkem.

### 3. Ochrana ručních zásahů

Pokud budou existovat ruční úpravy celkového pořadí, přidat potvrzení:

```text
Celkové výsledky už byly ručně upravené. Přegenerování tyto úpravy přepíše. Pokračovat?
```

Pokud zatím ruční úpravy celkového pořadí neexistují, stačí běžné potvrzení.

### 4. Testovací scénáře

- Vygenerovat celkové výsledky, změnit výsledek finále, přegenerovat.
- Vygenerovat celkové výsledky, opravit Q3 body, přegenerovat.
- Vygenerovat celkové výsledky se SF, opravit SF výsledek, přegenerovat.
- Přegenerování po změně nepostupujícího jezdce.

## Akceptační kritéria

- Celkové výsledky lze přegenerovat opakovaně.
- Přegenerování používá aktuální výsledky finále/SF/Q3.
- UI po přegenerování zobrazí nové pořadí.
- PDF export po přegenerování exportuje nové pořadí.
- Ruční zásahy nejsou potichu ztraceny bez potvrzení.

## Otevřené otázky

- Jsou celkové výsledky aktuálně ukládány jako snapshot, nebo jen počítané z dat?
- Má být přegenerování dostupné vždy, nebo jen po dokončeném finále?
- Má aplikace zobrazovat indikaci „celkové výsledky nejsou aktuální“?
- Má se po změně finále automaticky označit celkové pořadí jako zastaralé?
