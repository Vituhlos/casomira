# Plán — Verdict Live a Verdict Archive

> **Stav:** budoucí produktový směr, bez implementace v repu.  
> **Kontext:** Časomíra projde rebrandingem na **Verdict**. Tento dokument ukládá
> myšlenku rozšíření produktu mimo hlavní desktopovou aplikaci.

---

## Produktová mapa

| Produkt | Role | Zdroj pravdy |
|---------|------|--------------|
| **Verdict** | Hlavní desktopová aplikace pro vedení závodu, pravidla, výsledky, PDF a oficiální zápis. | Ano |
| **Verdict Companion** | Tablet u cíle: zapisování průjezdů, cílového pořadí a rychlé posílání dat do desktopu. Viz [detailní plán](./plan-verdict-companion.md). | Ne |
| **Verdict Live** | Živá/read-only vrstva pro diváky, týmy a pořadatele během závodu. | Ne |
| **Verdict Archive** | Dlouhodobý archiv závodů po skončení: PDF, výsledky, historie, statistiky. | Ne |

Základní pravidlo: **oficiální pravda zůstává v desktopu**. Companion, Live i
Archive smějí zobrazovat nebo posílat pomocná data, ale nemají přepočítávat
bodování ani rozhodovat výsledky mimo hlavní aplikaci.

---

## Verdict Live

**Účel:** veřejná nebo poloveřejná živá vrstva pro sledování závodu bez zásahu do
provozu časoměřiče.

Možné funkce:

- aktuální kategorie, fáze a jízda,
- startovní rošty,
- výsledky jednotlivých jízd po potvrzení v desktopu,
- průběžná klasifikace,
- stav typu „právě jede Q2 / N1600 / 2. jízda“,
- odkazy na PDF výsledky,
- jednoduché zobrazení pro mobil, tablet a obrazovku v depu.

Princip:

- Live čte jen data, která desktop potvrdil nebo publikoval.
- Live nesmí být druhá editovatelná databáze závodu.
- Pokud není internet, závod běží dál offline; Live je doplňková vrstva.
- Sportity může zůstat publikační kanál, ale Verdict Live je vlastní produktový
  směr pro web/live výsledky.

---

## Verdict Archive

**Účel:** dlouhodobý prohlížeč minulých závodů po skončení akce.

Možné funkce:

- seznam závodů podle roku, místa, typu a názvu,
- detail závodu s kategoriemi,
- PDF dokumenty ke stažení,
- read-only tabulky ze zálohy: startovka, rošty, výsledky, klasifikace,
- zobrazení dat ze stopek (`mereni`),
- vyhledání jezdce v historii závodů,
- později statistiky a porovnání napříč závody.

Princip:

- jeden upload = jeden snapshot závodu po skončení,
- archiv nepřepočítává pravidla, jen zobrazuje uložená data,
- změna po závodě znamená nový upload nebo novou verzi snapshotu,
- self-hosted varianta navazuje na plán [self-hosted archivu](./plan-archiv-web-unraid.md).

---

## Doporučené pořadí

1. Dokončit stabilní desktopový Verdict jako hlavní zdroj pravdy.
2. Ověřit **Verdict Companion** jako tabletový zápis průjezdů na lokální síti podle [detailního plánu](./plan-verdict-companion.md).
3. Navrhnout publikační model: co jde do Live okamžitě a co až po potvrzení.
4. Postavit minimální **Verdict Live** jako read-only web pro aktuální závod.
5. Z Live/backup exportu vyvodit **Verdict Archive** pro dlouhodobé prohlížení.

---

## Shrnutí jednou větou

**Verdict je oficiální desktop pro vedení závodu; Verdict Live ukazuje potvrzený
průběh závodu lidem okolo trati a Verdict Archive uchovává hotové závody jako
read-only historii.**
