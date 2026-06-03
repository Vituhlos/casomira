# Časomíra — checklist pro testera na Macu

Stručný průvodce pro **první ověření na macOS** — projdi ho na jeden zátah.  
Obecný návod k appce: [NAVOD-PRO-TESTERY.md](./NAVOD-PRO-TESTERY.md).

**Co připravit:** stažený `Casomira-x.x.x-mac-universal.dmg` z GitHub Releases. Funguje na Intel i Apple Silicon.

---

## 1. Instalace a Gatekeeper

- Otevři `.dmg`, přetáhni Časomíru do `Aplikace`.
- V Launchpadu klikni — macOS zobrazí hlášku „appka od neznámého vývojáře" → **zavři dialog**.
- V Finderu klikni na Časomíru **pravým tlačítkem → Otevřít → Otevřít**.
- Appka se spustí. V menu baru nahoře vlevo musí stát **„Časomíra"**, ne „Electron".
- Zkontroluj menu bar: musí být **Časomíra / Upravit / Okno** — žádné „View → Reload" ani „Developer Tools".

## 2. Databáze a první závod

- Appka se otevře bez dotazu na složku (databázi si sama vytvoří v `~/Library/Application Support/Časomíra`).
- Klikni **+ Nový závod** → vyplň název, datum, typ RAC → Vytvořit.
- Kategorie se zobrazí v levém panelu; klikni na libovolnou.

## 3. Startovní listina

- Na záložce **Startovní listina** přidej ručně 3–5 jezdců (příjmení, jméno, startovní číslo, los).
- Volitelně: importuj `.xlsx` soubor přes tlačítko **Importovat z Excelu**.
- Přejdi na **Q1 → Rošt** a zadej startovní čísla — ověř, že se doplní jméno a značka.

## 4. Klávesové zkratky

- Stiskni `?` — otevře se nápověda; modifikátor musí být **⌘** (ne Ctrl).
- `⌘P` → uloží PDF (poprvé se zeptá na složku).
- `⌘T` → otevře okno Stopky.
- `Alt+→` / `Alt+←` → přepínání fází.
- V textovém poli: `⌘C`, `⌘V`, `⌘Z` musí fungovat normálně.

## 5. Výsledky

- Na **Q1 → Výsledky** zadej 3–4 časy ve tvaru `1:23.456` (Enter po každém).
- Ověř, že se automaticky spočítá pořadí a body.
- Dvojklikem na buňku stavu vyzkoušej cyklus **DNF → DNS → DQ → (prázdné)**.

## 6. Stopky v samostatném okně

- `⌘T` otevře okno **Stopky** — přesuň ho na druhý monitor nebo vedle hlavního okna.
- Zvol kategorii a jízdu → klikni **Start**.
- Mačkej **mezerník** pro záznamy průjezdů; **Backspace** vrátí poslední.
- Přiřaď startovní čísla jezdcům → klikni **Zapsat do výsledků**.
- V hlavním okně ověř, že se výsledky aktualizovaly.

## 7. PDF export

- `⌘P` na obrazovce s výsledky → vyber složku → ověř, že `.pdf` soubor přibyl.
- V Nastavení (ozubené kolo) klikni **Exportovat vše** → ověř více PDF souborů.
- Otevři jeden PDF v Preview — obsah musí být čitelný, česky, formát A4.

## 8. Záloha a obnova

- **Nastavení → Zálohovat závod** → ulož `.json` soubor.
- Smaž nebo přejmenuj závod.
- **Nastavení → Obnovit ze zálohy** → vyber uložený soubor → závod musí přibýt s daty.

## 9. Zavření a ukončení

- Zavři okno **Stopky** červeným X — pokud jsou nezapsaná měření, appka se zeptá na potvrzení.
- Zavři **hlavní okno** — appka **neskončí** (zůstane v docku). ✓ Správné chování macOS.
- `⌘Q` nebo **Časomíra → Ukončit Časomíru** → appka se ukončí.

---

## Co sledovat a hlásit

| Co nahlásit | Co přiložit |
|---|---|
| Pád appky při startu nebo za běhu | `~/Library/Application Support/Časomíra/startup.log` |
| Zamrzlé UI nebo nereagující okno | Screenshot + popis kroku, při kterém nastalo |
| „Electron" místo „Časomíra" v menu | Screenshot menu baru |
| PDF s chybějícím nebo nečitelným textem | Daný PDF soubor |
| Cokoli, co nesedí s výsledkem z Excelu | Popis kategorie + co se čekalo vs co appka zobrazila |

Verzi appky najdeš vlevo dole v sidebaru (např. `v0.9.4`).
