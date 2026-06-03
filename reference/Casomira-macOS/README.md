# Časomíra — macOS verze

Vizuální mockup desktopové aplikace pro **časoměřičství autokrosového / rallycrossového závodu**, ve vzhledu nativní macOS aplikace (Apple HIG, Sonoma styl, světlý i tmavý režim).

Jde o **funkční klikací prototyp** běžící v prohlížeči (React + JSX, bez build kroku).

## Spuštění

Otevři `Časomíra — macOS.html` v prohlížeči (Safari / Chrome).
Soubor načítá React, Babel a fonty z CDN — pro plnou funkčnost je potřeba **připojení k internetu**.
SF Pro se vykreslí nativně jen na macOS; jinde prohlížeč padá zpět na systémové písmo.

## Struktura souborů

| Soubor | Obsah |
|---|---|
| `Časomíra — macOS.html` | Vstupní bod — načítá styly, knihovny a moduly |
| `mac.css` | Designové tokeny (barvy, vibrancy, rohy, stíny) pro light/dark + báze |
| `data.jsx` | Datový model — kategorie, fáze, jezdci, výsledky, bodování, formátování času |
| `m_ui.jsx` | UI primitivy — ikony, traffic lights, tlačítka, badge DNF/DNS/DQ, medaile |
| `m_shell.jsx` | Sidebar (vibrancy), unified toolbar, segmentový přepínač fází, hlavička obsahu |
| `m_screens.jsx` | Inset tabulky + Startovní listina, Rošty Q1, Výsledky Q1 |
| `m_more.jsx` | Klasifikace, Finále / Celkově, Stopky |
| `m_intro.jsx` | Správce závodů (launcher) + průvodce Nový závod |
| `m_app.jsx` | Kořen aplikace — okno, traffic lights, routing, Tweaks panel |
| `tweaks-panel.jsx` | Panel Tweaks (přepínač světlý/tmavý režim, pruhování řádků) |
| `screenshots/` | 9 náhledů všech obrazovek (light + dark) |

## Obrazovky

1. **Správce závodů** — karty závodů + zakládání nového (RAC Race / RX Cup → kategorie)
2. **Startovní listina** — editovatelná tabulka (Los, St. číslo, Příjmení, Jméno, Značka, Model)
3. **Rošty Q1** — jízdy po 8 pozicích; zadá se jen startovní číslo, zbytek se doplní
4. **Výsledky Q1** — čas mm:ss.sss, body dle pořadí (50/45/42/40/39…), stav DNF/DNS/DQ
5. **Klasifikace po Q2 / Q3** — průběžné pořadí se součtem bodů
6. **Finále / Celkově** — konečné pořadí (Q + SF + F), zvýraznění 1.–3. místa
7. **Stopky** — živé měření, tlačítko ZAZNAMENAT i mezerník, přiřazení startovních čísel

## Interakce

- Inline editace buněk tabulek (Enter potvrdí)
- Auto-doplňování odvozených polí v Roštech
- Výpočet bodů z pořadí; dvojklik na čas přepíná DNF/DNS/DQ
- Řazení výsledků a klasifikace
- Stopky: **mezerník** = záznam, **Backspace** = vrátit poslední
- Tweaks panel: přepínač **Světlý / Tmavý** režim

## Poznámka

Tlačítka „Importovat z Excelu" a „Uložit PDF" jsou napojena vizuálně
(PDF využívá tisk prohlížeče); reálný import/export by řešila nativní aplikační vrstva.

Ukázková data jsou smyšlená, slouží k předvedení vzhledu a chování.
