# Plán — Avalonia/Ursa UI spike pro Verdict

> **Stav:** návrh k provedení, 2026-06-25.  
> **Cíl:** ověřit, že Avalonia verze může věrně přenést pocit původní
> Electron/HeroUI aplikace pomocí Mica-like host okna, Verdict design tokenů a
> Ursa/Semi komponentové mechaniky.  
> **Zdroj vzhledu:** [docs/design.md](../design.md).  
> **Neřeší:** port pravidel závodu, scoring, DB migrace, PDF engine.

---

## 1. Rozhodnutí

ShadUI už není preferovaný UI směr pro Verdict. Pro spike zvolíme:

- **Avalonia 12** jako runtime/UI framework,
- **Ursa/Semi** jako kandidátní komponentový základ,
- **Verdict.UI wrapper vrstvu** jako jediný jazyk aplikace,
- **Electron screenshoty** jako vizuální referenci,
- **Mica/Acrylic-like okno** jako host surface.

Ursa se používá kvůli hotovým interakcím, floating panelům, overlayům a
komponentové šířce. Nepřebírá se vzhled Ursa demo.

## 2. Proč nejdřív spike

Současná Avalonia migrace už ukázala, že funkční port bez vizuální kontroly vede
k aplikaci, která sice běží, ale působí jako jiný produkt. Spike má odpovědět na
jednu otázku:

> Dokážeme v Avalonia/Ursa směru postavit hlavní obrazovku tak, aby vedle
> Electron screenshotu působila jako stejný Verdict?

Pokud ne, nepokračovat plošnou migrací UI.

## 3. Scope spike 1 — Startovní listina

Implementovat pouze jednu obrazovku:

- AppWindow s Mica/Acrylic/fallback host pozadím,
- levý sidebar podle Electron reference,
- topbar s breadcrumbem a akcemi,
- phase tabs,
- content surface,
- startovní listina jako měkká tabulka,
- tlačítka `Importovat z Excelu`, `Přidat jezdce`, `Stopky`, `Tisknout`,
  `Uložit PDF`,
- PDF dropdown/floating menu jako vizuální vzor.

Data mohou být napojená na existující ViewModel nebo statická podle toho, co je
rychlejší pro vizuální ověření. Spike není feature práce.

## 4. Scope spike 2 — Stopky

Pokud spike 1 projde, ověřit druhou klíčovou obrazovku:

- samostatné okno stopek,
- high-priority timer layout,
- velký čas,
- primary `ZAZNAMENAT`,
- měřené časy vlevo,
- rošt jízdy vpravo,
- potvrzovací dialog nezapsaných měření.

Stopky jsou ergonomický gate. Pokud budou vypadat dobře, ale půjdou špatně
ovládat klávesnicí, směr není hotový.

## 5. Technické zásady

- Nepsat produkční obrazovky přímo proti Ursa/Semi komponentám bez wrapperu.
- Zavést `Verdict.UI` nebo ekvivalentní `Styles/Controls` vrstvu.
- Resource dictionaries rozdělit minimálně na:
  - aktuálně: `Styles/VerdictTokens.axaml`
  - aktuálně: `Styles/VerdictControls.axaml`
  - později podle růstu: `Window.axaml`, `Shell.axaml`, `Tables.axaml`,
    `Dialogs.axaml`
- V obrazovkách nepoužívat raw hex hodnoty ani náhodná čísla spacingu.
- Mica/Acrylic musí mít fallback, aby appka zůstala použitelná bez podpory
  systémového materiálu.
- Všechny interaktivní prvky musí mít hover, pressed, focus-visible a disabled
  stav.

## 6. ShadUI cleanup

ShadUI nemazat v prvním kroku, protože je už v pracovním stromu a část Avalonia
projektu na něj odkazuje. Odstranit ho až jako samostatný cleanup po schválení
Ursa směru.

Cleanup checklist:

1. Najít všechny odkazy na `ShadUI`, `shad-ui`, `shadui`.
2. Nahradit `ShadUI.Controls.Window`/themes běžným `Window` nebo
   `VerdictAppWindow`.
3. Odstranit `ProjectReference` z `apps/desktop-net/Verdict.Desktop`.
4. Odstranit namespaces z `App.axaml`, `MainWindow.axaml`,
   `MainWindow.axaml.cs` a dalších views.
5. Odstranit `.gitmodules` záznam pro `apps/desktop-net/vendor/shad-ui`.
6. Odstranit složku `apps/desktop-net/vendor/shad-ui`.
7. Spustit build/testy.

Tohle má být čistý commit bez současného redesignu.

## 7. Acceptance gates

Spike 1 je úspěšný jen když:

- screenshot hlavní obrazovky je vizuálně blízko Electron referenci,
- appka nemá plochý tmavý desktop background,
- tabulka nepůsobí jako standardní desktop grid,
- texty se neřežou v běžné šířce okna,
- phase tabs zvládnou přetékání,
- sidebar drží stejnou hierarchii jako Electron,
- primary/secondary akce mají správnou váhu,
- focus ring je viditelný.

Spike 2 je úspěšný jen když:

- klávesové workflow stopek zůstává rychlé,
- čas a `ZAZNAMENAT` jsou jednoznačně hlavní,
- nezapsaná měření mají jasný potvrzovací dialog,
- layout je použitelný na běžném notebooku.

## 8. Doporučené pořadí práce

1. Uklidit rozhodnutí v dokumentaci.
2. Založit samostatnou větev pro UI spike.
3. Přidat Ursa/Semi balíčky a minimální demo shell.
4. Vytvořit tokeny podle `docs/design.md`.
5. Zprovoznit Mica/Acrylic host okno.
6. Postavit `VerdictShell`.
7. Postavit `Startovní listina` spike.
8. Udělat screenshot a porovnat s Electron referencí.
9. Teprve po schválení řešit ShadUI cleanup.
10. Pokračovat na `Stopky` spike.

## 9. Stop podmínky

Zastavit a přehodnotit, pokud:

- Mica/Acrylic v Avalonii nejde udělat spolehlivě s rozumným fallbackem,
- Ursa/Semi styly nejdou zkrotit bez rozsáhlých forků,
- tabulky nejdou dostat na Electron feeling bez vlastního table controlu,
- build nebo runtime začne být křehký kvůli kombinaci více UI kitů,
- spike po vizuálním porovnání pořád působí jako jiný produkt.

## 10. Výstup spike fáze

Na konci musí existovat:

- screenshot Avalonia spike obrazovky,
- krátké rozhodnutí pokračovat/nepokračovat,
- seznam komponent, které půjdou do `Verdict.UI`,
- cleanup plán ShadUI buď potvrzený, nebo zrušený,
- aktualizované `docs/design.md`, pokud se tokeny během spike zpřesní.
