# PROMPT 01 — Scaffold + databáze + první obrazovka

> Vlož CELÝ tento text do Claude Code (běžícího ve složce `Casomira`).

---

Ahoj. Budeme společně stavět desktopovou aplikaci. Kompletní zadání máš v souboru
`CLAUDE.md` ve složce — **přečti si ho celé jako první**, je to zdroj pravdy pro
celý projekt. Ve složce je taky `reference/Casomira-macOS/` — hotový vizuální prototyp
z Claude Design, ze kterého přebíráme VZHLED (hlavně `mac.css`), ale NE bodovou
logiku (ta je v prototypu zjednodušená a špatná — řiď se pravidly v `CLAUDE.md`).

Důležité o mně: **nejsem programátor a do kódu nebudu sahat.** Veď mě krok za
krokem, vysvětluj jednoduše co a proč děláš, a když budeš něco potřebovat ode mě,
zeptej se konkrétně. Nespěchej, jdeme po malých ověřitelných krocích.

## Co udělat v tomto prvním kroku

Postav **kostru aplikace** a první funkční obrazovku. Konkrétně:

1. **Založ projekt: Electron + React + Vite + TypeScript.**
   - Použij `better-sqlite3` pro lokální databázi.
   - Nastav to tak, aby šlo spustit ve vývojovém režimu jedním příkazem
     (např. `npm run dev`) a otevřelo se okno aplikace.
   - Vysvětli mi, jaký příkaz mám napsat pro spuštění, až bude hotovo.

2. **Převezmi vzhled z prototypu.**
   - Zkopíruj `reference/Casomira-macOS/mac.css` jako základ stylů (designové tokeny pro
     světlý i tmavý režim). Toto je zdroj pravdy pro vzhled.
   - Použij stejnou strukturu komponent jako prototyp (sidebar, toolbar,
     segmentový přepínač fází, inset tabulky). Vzhled musí odpovídat schváleným
     screenům.

3. **Vytvoř databázi (SQLite) podle datového modelu v `CLAUDE.md`** (sekce 11).
   - Naber tabulky: zavod, kategorie, jezdec, kolo, jizda, rost_pozice, vysledek,
     zebricek, pravidla (mereni a uprava_log můžeme přidat později — jsou pro
     fázi 2, ale model na ně myslí).
   - Udělej migrace tak, aby se databáze sama vytvořila při prvním spuštění.

4. **Postav první obrazovku: Startovní listina** (přesně jako v prototypu).
   - Levý panel kategorií, horní toolbar (Stopky + Uložit PDF), segment fází.
   - Tabulka jezdců: Los · St. číslo · Příjmení · Jméno · Značka · Model.
   - Data ať se načítají z SQLite (zatím klidně pár testovacích jezdců vlož do DB,
     ať je co zobrazit).
   - Inline editace buněk jako v prototypu.
   - Tlačítka „Importovat z Excelu" a „Přidat jezdce" zatím můžou být jen
     připravená (funkčnost doděláme příště).

5. **Funkční přepínač světlý / tmavý režim** (jako v prototypu).

## Na konci tohoto kroku chci:
- Spustit appku jedním příkazem a vidět okno se Startovní listinou.
- Vidět v něm pár jezdců načtených z databáze.
- Umět přepnout světlý/tmavý režim.
- Vědět od tebe, co budeme dělat v dalším kroku.

Než začneš psát kód, **napiš mi krátký plán** (3–6 bodů), co budeš dělat, ať vím,
do čeho jdeme. Pak teprve začni. Díky!
