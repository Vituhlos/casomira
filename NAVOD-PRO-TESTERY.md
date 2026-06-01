# Časomíra — návod pro vyzkoušení (testovací verze)

Tento text můžeš poslat časoměřiči spolu s instalátorem. Popisuje **co aplikace umí** a **jak s ní projít typický závod** — bez programátorských detailů.

> **Verze dokumentu:** k aplikaci **0.9.1** (Electron, Windows + Mac).  
> **Instalace na Mac:** Word `docs/Casomira-instalace-Mac.docx` (nebo [INSTALACE-MAC.md](./INSTALACE-MAC.md)). Na Windows spusť `Casomira-Setup-….exe` z release.

---

## Co je Časomíra

**Časomíra** je počítačový náhradník dnešních Excelových sešitů na závod — jeden program na **celý závod**, každá **kategorie** (N1600, Cross Cup, Šotolina…) má vlastní data, rošty, časy, body a PDF.

- Běží **offline** — nepotřebuje internet ani přihlášení.
- Data jsou **jen v tomto počítači** (lokální databáze).
- Počítá **pořadí a body** podle pravidel autokrosu / rallycrossu (včetně DNF, DNS, DQ).
- Umí **tisknout PDF** jednotlivých listů (jako dnes z Excelu).

---

## Co potřebuješ

| | |
|---|---|
| **Počítač** | Windows 10+ nebo Mac (Intel i Apple Silicon u verze *mac-universal*) |
| **Oprávnění** | Běžný uživatelský účet stačí |
| **Volitelně** | Staré Excelové sešity `.xls` / `.xlsx` pro import startovek |
| **Na závodě** | Klidně druhý monitor nebo druhé okno na **Stopky** (viz níže) |

---

## Základní pojmy (jak je to v appce)

```text
ZÁVOD (RAC Race nebo RX Cup, zvolíš při založení)
 └── KATEGORIE (jako jeden excelový sešit — N1600, Junior, Šotolina…)
      └── FÁZE (horní lišta: Startovní listina → Q1 → Q2 → … → Celkově)
           └── u Q / SF / Finále: podzáložka  Rošt  |  Výsledky
```

- **Levý panel** — přepínání kategorií (u každé vidíš počet jezdců).
- **Horní lišta (segment)** — fáze závodu; u RX Cup **není** záložka „Klasifikace po Q2“ (pořád se ale počítá pro Q3).
- **Kategorie Šotolina** — jiná lišta: místo Semifinále/Finále jsou **Finále B** a **Finále A**.

---

## 1. Úvodní obrazovka — Závody

Po spuštění vidíš seznam závodů.

| Akce | Kde |
|------|-----|
| **Nový závod** | tlačítko vpravo nahoře |
| **Otevřít závod** | klik na řádek / kartu závodu |
| **Upravit / smazat** | u existujícího závodu (ikony / menu u závodu) |
| **Světlý / tmavý režim** | ikona slunce/měsíce |

### Založení nového závodu

1. **Nový závod**
2. Vyplň **název**, **datum**, **místo**
3. Zvol **typ:** **RAC Race** (Hobby) nebo **RX Cup** — typ už pak neměníš, určuje strukturu závodu
4. Zaškrtni **kategorie**, které chceš vést (N1600, Cross Cup…). U RAC můžeš přidat i **Šotolinu**
5. Ulož — vstoupíš do závodu

---

## 2. Hlavní okno závodu

### Levý sidebar

- Seznam **kategorií** — klikni na kategorii, se kterou právě pracuješ.
- Dole: název závodu, datum, verze appky.

### Horní toolbar

| Tlačítko | K čemu |
|----------|--------|
| **← Zpět** | Návrat na seznam závodů |
| **Stopky** | Otevře **samostatné okno** pro měření časů v cíli (viz kapitola Stopky) |
| **Uložit PDF** | Uloží **aktuální obrazovku** jako PDF (stejný list jako v Excelu) |
| Šipka u PDF | **Uložit jako…** (jiná složka) nebo **Otevřít složku PDF** |
| **Zásahy** | Přehled úprav ředitele (penalizace, posuny) — audit |
| **Nastavení** | Logo do PDF, složka pro PDF, hromadný export všech listů |
| Ikona měsíce/slunce | Přepnutí vzhledu |

### Horní segment (fáze)

Přepínáš např. **Startovní listina → Q1 → Q2 → Klasifikace po Q2 → …**

U **Q1, Q2, Q3, Semifinále, Finále** (a Finále A/B) jsou dvě **podzáložky**:

- **Rošt** — kdo v jaké jízdě startuje (zadáváš startovní čísla)
- **Výsledky** — časy, body, stavy DNF/DNS/DQ

---

## 3. Startovní listina

**Co tu uděláš:** máš kompletní seznam jezdců kategorie.

| Akce | Jak |
|------|-----|
| **Import z Excelu** | Tlačítko *Importovat z Excelu* — vybereš soubor, zaškrtneš listy/kategorie, potvrdíš |
| **Přidat jezdce** | Ručně jeden řádek |
| **Upravit buňku** | Klik na pole → přepiš → **Enter** (los, st. číslo, jméno, značka, model) |
| **Smazat jezdce** | Ikona koše u řádku |

Řazení je podle **losu**. Startovní číslo musí být v kategorii **jedinečné**.

---

## 4. Rošty (Q1, Q2, Q3, SF, Finále…)

**Co tu uděláš:** do mřížky zadáš **startovní čísla** na pozice 1–8 v každé jízdě. Appka doplní jméno, značku a model ze startovní listiny.

| Akce | Jak |
|------|-----|
| Zadat číslo do pozice | Klik na buňku → číslo → Enter |
| Varování | Červeně / hláška: číslo neexistuje, nebo je **dvakrát ve stejné jízdě** |
| **Vygenerovat rošt** | Tlačítko (kde je k dispozici) — návrh podle pravidel; **zkontroluj** a případně uprav |

**Tip:** U Q1 často nejdřív rošt podle losu, u dalších kol podle klasifikace — generátor pomůže, ale v testovací verzi vždy ověř výsledek oproti papíru / Excelu.

---

## 5. Výsledky jízdy

**Co tu uděláš:** po dojetí jízdy zadáš **časy** a případně **stavy**; appka **seřadí** a **přidělí body**.

### Zadání času

- Klikni do sloupce **Čas** u jezdce.
- Napiš čas ve tvaru **`mm:ss.sss`** (např. `1:23.456`) → Enter.
- Appka přepočítá **pořadí** a **body** v jízdě.

### Stavy DNF / DNS / DQ

- Do pole času můžeš napsat **`dnf`**, **`dns`**, **`dq`** (nebo zkratky **f / s / q**).
- Nebo klikni na **šipku / menu** vpravo u řádku → vyber stav.
- Body se dopočítají podle pravidel kategorie (Hobby vs Šotolina se liší).

### Ruční úprava bodů

- Sloupec **Body** — lze přepsat (např. když ředitel něco mění ručně).

### Penalizace ředitele (pokročilé)

- Menu u řádku → **Penalizace ředitele…**
- **Časová** (+ sekundy k naměřenému času), **bodová**, **posun pořadí**
- U zásahu je u řádku označení **pen.** — přehled všech zásahů: toolbar **Zásahy**

### Co zatím není jako ve starém Excelu

- **Hromadné vložení** celého výpisu z Free Stopwatch jedním paste do schránky — v této verzi **ještě ne**. Časy zadáváš po řádcích, nebo použij **Stopky** (níže).

---

## 6. Klasifikace a Celkově

| Záložka | Obsah |
|---------|--------|
| **Klasifikace po Q2** | Součet bodů Q1+Q2, pořadí (u Šotoliny i sloupec **Los** pro tiebreak) |
| **Klasifikace po Q3** | Součet Q1+Q2+Q3 |
| **Celkově** | Finální pořadí závodu v kategorii (včetně bodů z finále / SF dle typu) |

Medaile u 1.–3. místa = vizuální zvýraznění pořadí.

---

## 7. Semifinále, Finále, Šotolina A/B

### RAC Race / RX Cup (běžná kategorie)

- **Semifinále** — rošty + výsledky (čas u SF nemusíš měřit, stačí pořadí / stavy dle pravidel)
- **Finále** — rošty + výsledky; u Hobby můžeš přepínat velikost finále (8 / 10 jezdců), kde je to v UI

### Šotolina

- **Finále B**, pak **Finále A** — stejný princip Rošt / Výsledky
- Žádné semifinále

---

## 8. Stopky (druhé okno)

Tlačítko **Stopky** v toolbaru otevře **samostatné okno** — vhodné vedle hlavní appky na stanovišti.

**Typický postup:**

1. Vyber **kategorii** a **jízdu** (Q1, Q2, …).
2. **Start** — začne běžet čas jízdy (zelená / start).
3. Při každém cíli: **velké tlačítko** nebo **mezerník** — uloží se pořadí průjezdu (čas od startu).
4. **Backspace** — vrátit poslední klik (překlep).
5. Po dojetí: u každého řádku doplň **startovní číslo** podle papíru z cíle (Enter = další řádek).
6. **Zapsat do výsledků** — přenese časy do hlavní appky, přepočítá pořadí a body.

Stopky **nepřebírají** automaticky rošt — je dobré mít rošt v hlavní appce už hotový.

---

## 9. PDF

### Jedna obrazovka

1. Otevři fázi, kterou chceš vytisknout (např. **Q1 → Výsledky**).
2. **Uložit PDF** — uloží se do nastavené struktury složek (jako dřív `Q1_výsledky.pdf`).

### Nastavení složky

**Nastavení** → zvol **kořenovou složku pro PDF** (např. složka závodu na disku). Bez toho tě appka vyzve při prvním exportu.

### Hromadný export

**Nastavení** → zaškrtni kategorie → export všech listů najednou (trvá déle).

Logo v hlavičce PDF: lze nahrát v Nastavení.

---

## 10. Doporučený postup na zkušební „minizávod“

Ideální scénář na 30–60 minut testu:

1. Založ **testovací závod** (RAC, 1–2 kategorie).
2. **Importuj** startovku z Excelu nebo přidej 5–8 jezdců ručně.
3. V **Q1 → Rošt** zadej nebo vygeneruj rošt, oprav jedno číslo.
4. V **Q1 → Výsledky** zadej pár časů a jeden **DNF** — zkontroluj pořadí a body.
5. Otevři **Klasifikace po Q2** (pokud máš Q2 vyplněné).
6. **Uložit PDF** u startovky a u výsledků Q1 — otevři složku, koukni na vzhled.
7. Vyzkoušej **Stopky** na jedné jízdě a **Zapsat do výsledků**.
8. (Volitelně) **Penalizace ředitele** na jednom jezdci + koukni do **Zásahy**.

Zapiš si, co bylo matoucí nebo co nesedí s papírovým/Excelovým výsledkem.

---

## 11. Co v testovací verzi ještě nečekej

| Funkce | Stav |
|--------|------|
| Automatické rošty Q2/Q3 podle všech pravidel seedingu | částečně / kontroluj ručně |
| Paste box časů ze schránky (Free Stopwatch) | zatím ne |
| Záloha / obnova celého závodu jedním souborem | zatím ne |
| Síť / mobilní zadávání | ne |
| Podpis Apple / notarizace Mac | ne — první spuštění přes *Otevřít* pravým tlačítkem |

---

## 12. Co nahlásit provozovateli

Pošli prosím:

- **verzi** (vlevo dole v sidebaru, např. v0.9.1),
- **Windows nebo Mac** + verze systému,
- **typ závodu** (RAC / RX) a **kategorie**,
- **co jsi dělal** (krok za krokem),
- **co jsi čekal** vs **co se stalo**,
- screenshot nebo PDF, pokud něco vypadá špatně.

---

## Rychlá mapa kláves a chování

| Situace | Akce |
|---------|------|
| Uložit editaci v tabulce | **Enter** |
| Stopky — záznam cíle | **Mezerník** |
| Stopky — vrátit poslední klik | **Backspace** |
| Přepnutí kategorie | Levý panel |
| Aktuální fáze | Horní segment |

---

*Tento návod je určený pro testery. Technické sestavení instalátorů: [BUILD.md](./BUILD.md).*
