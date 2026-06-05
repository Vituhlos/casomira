# Issue 007 — Odstranit speciální ruleset/pipeline Šotolina

## Stav

Plánováno.

## Cíl

Odstranit z aplikace všechny zbytky starého konceptu, že **Šotolina má vlastní pravidla**. Kategorie `Šotolina` má zůstat jen obyčejná kategorie v RAC závodu a má používat stejný průběh jako ostatní kategorie:

```text
Q1 → Q2 → Q3 → Semifinále podle pravidel → Finále → Celkově
```

U Šotoliny už nemá existovat speciální pipeline:

```text
Finále B → Finále A
```

A nemá mít vlastní bodování, vlastní tiebreak přes los, vlastní exportní sadu ani vlastní obrazovky.

## Kontrola aktuálního stavu kódu

### Závěr kontroly

V kódu je už částečný náznak migrace směrem ke sjednocení: migrace v11 převádí existující kategorie s `ruleset = 'SOTOLINA'` na `STANDARD`.

Současně ale v aplikaci zůstává mnoho aktivních míst, která pořád počítají se `SOTOLINA`, `F_A`, `F_B`, `Finále A` a `Finále B`. Důležité zjištění: **pro novou čistou databázi se po migraci spouští seed, který znovu založí kategorii Šotolina s `ruleset = 'SOTOLINA'`**. To znamená, že čistá instalace může stále dostat Šotolinu se starou A/B pipeline.

Proto platí:

```text
Není ještě bezpečně zaručeno, že Šotolina má v aplikaci list Finále stejně jako ostatní kategorie.
```

Pokud kategorie `Šotolina` skončí s `ruleset = 'STANDARD'`, bude používat běžné `Finále`. Pokud ale vznikne nebo zůstane jako `SOTOLINA`, UI a backend pro ni stále nabízí `Finále B` a `Finále A`.

## Nalezené oblasti k odstranění / předělání

### 1. Sdílené typy

Soubor:

```text
src/shared/types.ts
```

Aktuální problémy:

- `Ruleset` pořád obsahuje `'SOTOLINA'`.
- `KoloTyp` pořád obsahuje `'F_A'` a `'F_B'`.
- `CelkoveRadek` obsahuje pole pro pořadí ve Finále A/B.
- `ZaverStav` obsahuje stav Finále A/B a počty do A/B.
- `ListKey` obsahuje `final_a_*` a `final_b_*`.
- `CasomiraApi` vystavuje `navrhFinaleA` a `navrhFinaleB`.

Cílový stav:

```ts
export type Ruleset = 'STANDARD'
export type KoloTyp = 'Q1' | 'Q2' | 'Q3' | 'SF' | 'F'
```

Praktická poznámka: pokud chceme zachovat kompatibilitu se starými zálohami/databází, může být vhodné dočasně nechat interní legacy typy, ale UI ani nová data už je nesmí používat.

### 2. Databázové schéma a migrace

Soubory:

```text
src/main/db/schema.ts
src/main/db/migrate.ts
src/main/db/seed.ts
src/main/backup/types.ts
src/main/backup/import.ts
src/main/backup/export.ts
```

Aktuální problémy:

- `kategorie.ruleset` má CHECK `('STANDARD','SOTOLINA')`.
- `kolo.typ` má CHECK `('Q1','Q2','Q3','SF','F','F_A','F_B')`.
- `zebricek.ruleset` a `pravidla.ruleset` mají také `SOTOLINA`.
- `pravidla` obsahuje sloupce pro absolutní penalizace Šotoliny (`dnf_body`, `dns_body`, `dq_body`).
- `seed.ts` pořád zakládá `Šotolina` s `ruleset = 'SOTOLINA'` a vkládá SOTOLINA žebříček/pravidla.
- Migrace v11 sice převádí stará data na STANDARD, ale běží před seedem. Seed po ní může znovu vytvořit SOTOLINA kategorii.

Cílový stav:

- `Šotolina` v seedu musí být `STANDARD`.
- Nová databáze nesmí obsahovat novou SOTOLINA kategorii.
- Staré `F_A`/`F_B` kolo v databázi je potřeba migrovat nebo archivovat.
- Fresh schema by mělo výhledově odstranit `SOTOLINA`, `F_A`, `F_B` z CHECK constraintů.
- Pokud SQLite neumí jednoduše změnit CHECK constraint, bude potřeba tabulky přestavět přes dočasné tabulky.

Navržená migrační pravidla:

1. `UPDATE kategorie SET ruleset = 'STANDARD' WHERE ruleset = 'SOTOLINA'`.
2. U starých kol:
   - pokud existuje `F_A`, převést na `F`, pokud v kategorii ještě není `F`,
   - pokud existuje `F_B`, pravděpodobně ho odstranit nebo archivovat, protože nová pravidla s ním nepočítají,
   - pokud existují obě `F_A` a `F_B`, rozhodnout, jestli `F_A` je hlavní finále a `F_B` jen legacy data.
3. Zálohy se starým `SOTOLINA` importovat jako `STANDARD`.
4. Zálohy se starými `F_A`/`F_B` mapovat na `F` nebo odmítnout s vysvětlením podle zvolené strategie.

### 3. Výchozí kategorie a dialog závodu

Soubory:

```text
src/renderer/src/screens/RaceDialog.tsx
src/renderer/src/data/raceDefaults.ts
src/main/repo.ts
```

Aktuální problémy:

- `RaceDialog` přidává `Šotolina` jako zvláštní název pro RAC závod.
- `rulesetPro()` vrací pro název `Šotolina` hodnotu `SOTOLINA`.
- Text UI říká, že Šotolina jede podle vlastních pravidel, body 14→1 a finále A/B.
- Backend při synchronizaci kategorií místy ignoruje předaný ruleset a vynucuje STANDARD, ale UI pořád komunikuje starou logiku.

Cílový stav:

- `Šotolina` může zůstat v nabídce kategorií, ale musí mít `ruleset = 'STANDARD'`.
- Odstranit texty o vlastních pravidlech, bodování 14→1 a finále A/B.
- `rulesetPro()` buď zrušit, nebo vždy vracet `STANDARD`.
- U vlastních kategorií nepoužívat žádnou speciální logiku podle názvu.

### 4. Fázová lišta v hlavním okně

Soubor:

```text
src/renderer/src/data/phases.ts
```

Aktuální problémy:

- `phasesForCategory()` větví podle `ruleset === 'SOTOLINA'`.
- Pro `SOTOLINA` vrací `final_b` a `final_a` místo běžného `final`.
- Komentáře pořád popisují Šotolinu jako kategorii s Finále B/A.

Cílový stav:

- Odstranit větev pro `SOTOLINA`.
- Všechny kategorie používat stejnou fázi `final`.
- Rozdíl RAC/RX řešit pouze tam, kde je opravdu potřeba, ne přes Šotolinu.

### 5. Routing obrazovek

Soubor:

```text
src/renderer/src/App.tsx
```

Aktuální problémy:

- App routing pořád obsahuje fáze `final_a` a `final_b`.
- Importuje a renderuje `FinaleAB`.
- `listProFazi()` pravděpodobně mapuje `final_a/final_b` na `final_a_*` / `final_b_*` PDF listy.

Cílový stav:

- Odstranit route/fáze `final_a` a `final_b`.
- Odstranit import `FinaleAB`.
- Všechny kategorie renderují standardní `Finale` přes typ `F`.
- PDF mapping má pro finále používat jen `final_rost` a `final_res`.

### 6. Obrazovka Finále A/B

Soubor:

```text
src/renderer/src/screens/FinaleAB.tsx
```

Aktuální problémy:

- Celý soubor je specifický pro starou Šotolinu.
- Používá `F_A`, `F_B`, `navrhFinaleA`, `navrhFinaleB`, `finaleAHotovo`, `finaleBHotovo`, `pocetDoA`, `pocetDoB`.

Cílový stav:

- Soubor odstranit, pokud už nebude žádná A/B pipeline.
- Pokud by bylo potřeba zachovat legacy read-only pohled pro staré závody, přesunout ho mimo běžnou navigaci a neukazovat pro nové závody.

### 7. Stopky

Soubor:

```text
src/renderer/src/StopkyApp.tsx
```

Aktuální problémy:

- Mapa kol obsahuje `F_A` a `F_B`.
- `kolaProRuleset()` pro `SOTOLINA` vrací `Q1`, `Q2`, `Q3`, `F_B`, `F_A`.
- UI komentáře popisují Šotolinu jako bez SF/F.

Cílový stav:

- Dostupná kola mají být jen `Q1`, `Q2`, `Q3`, `SF`, `F`.
- Pro Šotolinu nepoužívat speciální stopkové pořadí.
- Pokud bude Šotolina STANDARD, automaticky spadne na stejný seznam jako ostatní kategorie.

### 8. Backend roštů a výsledků

Soubor:

```text
src/main/repo.ts
```

Aktuální problémy:

- `poradiKola()` řadí `F_B` a `F_A`.
- Existuje speciální generování šotolinových roštů/fixních skupin.
- `navrhniRost()` větví podle `ruleset === 'SOTOLINA'`.
- `zapisRost()` propojuje Šotolinu se skupinami.
- `getKlasifikace()` používá pro `SOTOLINA` tiebreak podle losu.
- `getZaverStav()` má samostatnou větev pro `SOTOLINA` a vrací stav Finále A/B.
- Existují funkce `navrhFinaleA()` a `navrhFinaleB()`.
- `getCelkove()` má samostatnou větev pro `SOTOLINA` a používá `F_A`/`F_B`.

Cílový stav:

- Odstranit nebo deaktivovat `navrhFinaleA()` a `navrhFinaleB()`.
- `getZaverStav()` má pro všechny kategorie používat standardní `SF/F` logiku.
- `getCelkove()` má pro všechny kategorie používat standardní výpočet přes `SF/F`.
- `navrhniRost()` nemá větvit podle `SOTOLINA`.
- Skupiny buď odstranit, nebo nechat jen jako nepoužívanou legacy strukturu, ale nesmí ovlivňovat nové závody.
- Tiebreak Šotoliny podle losu odstranit; platí běžný tiebreak dle issue 003.

### 9. PDF export

Soubor:

```text
src/main/pdf.ts
```

Aktuální problémy:

- PDF názvy obsahují `ROŠT FINÁLE B`, `VÝSLEDKY FINÁLE B`, `ROŠT FINÁLE A`, `VÝSLEDKY FINÁLE A`.
- `SOUBOR` obsahuje `Finale_A_*` a `Finale_B_*`.
- Existuje `PORADI_SOTOLINA` s Finále B/A.
- `exportVse()` větví podle `kat.ruleset === 'SOTOLINA'` a exportuje A/B listy.

Cílový stav:

- Odstranit `final_a_*` a `final_b_*` z běžného exportu.
- Hromadný export má pro Šotolinu použít `PORADI_STANDARD`.
- Pokud zůstane legacy typ v datech, export buď:
  - ignoruje legacy A/B listy,
  - nebo je nabídne jen v diagnostickém režimu, ne v běžném workflow.

### 10. Celkové výsledky UI

Soubor:

```text
src/renderer/src/screens/Overall.tsx
```

Aktuální problémy:

- Existují zvláštní sloupce `PFB` a `PFA`.
- Podtitulek pro Šotolinu vysvětluje pořadí přes Finále A/B.

Cílový stav:

- Používat pouze standardní sloupce `PQ`, `PSF`, `PF`, `BQ`.
- Nevětvit podle Šotoliny.
- Texty o Finále A/B odstranit.

### 11. UI logy a popisky

Soubory:

```text
src/renderer/src/components/UpravaLogModal.tsx
src/renderer/src/components/Sidebar.tsx
src/renderer/src/screens/Standings.tsx
src/renderer/src/screens/Finale.tsx
src/renderer/src/screens/Semifinale.tsx
```

Cílový stav:

- Odstranit mapování `F_A`/`F_B` na `Finále A/B` z UI logů.
- Sidebar může stále používat název Šotolina jako obyčejnou kategorii, ale ne kvůli pravidlům.
- `Standings` nemá popisovat šotolinový los tiebreak.
- `Finale` a `Semifinale` nemají odkazovat na speciální Šotolina pravidla.

### 12. Dokumentace

Soubory:

```text
CLAUDE.md
docs/user/NAVOD-PRO-TESTERY.md
docs/dev/prompt-stitch-macos26.md
```

Aktuální problémy:

- Dokumentace stále tvrdí, že Šotolina má vlastní pravidla, vlastní bodování, Finále A/B, los tiebreak a skupiny.

Cílový stav:

- Přepsat zadání tak, že `Šotolina` je běžná RAC kategorie.
- Odstranit zmínky o `ruleset=SOTOLINA` jako aktivním konceptu.
- Odstranit Finále A/B z uživatelského návodu.
- Pokud je potřeba uchovat historickou poznámku, přesunout ji do archivní části.

## Doporučený implementační postup

### Fáze 1 — Zastavit vznik nových SOTOLINA dat

Nejdřív odstranit tvorbu nových `SOTOLINA` dat:

1. Upravit `seed.ts`, aby `Šotolina` byla `STANDARD`.
2. Upravit `RaceDialog.rulesetPro()`, aby vždy vracel `STANDARD`.
3. Upravit texty v dialogu závodu.
4. Přidat/ověřit migraci, která převede existující `SOTOLINA` kategorie na `STANDARD` i po případném starém seedu.

Akceptace fáze:

- Nový závod s kategorií Šotolina vytvoří kategorii s `ruleset = 'STANDARD'`.
- Čistá instalace nevytvoří `ruleset = 'SOTOLINA'`.

### Fáze 2 — Sjednotit UI na jeden list Finále

1. Upravit `phases.ts`, aby nevracel `final_a/final_b`.
2. Upravit `App.tsx`, odstranit routing na `FinaleAB`.
3. Odstranit nebo odpojit `FinaleAB.tsx`.
4. Upravit `StopkyApp.tsx`, aby nepoužíval `F_A/F_B`.
5. Upravit `Overall.tsx`, aby neukazoval PFA/PFB.

Akceptace fáze:

- Kategorie Šotolina v UI ukazuje záložku `Finále`, ne `Finále A` a `Finále B`.
- Stopky pro Šotolinu nabízí `Finále`, ne `F-A/F-B`.

### Fáze 3 — Sjednotit backend výpočty

1. Odstranit větve `ruleset === 'SOTOLINA'` z roštů, klasifikací, závěru a celkových výsledků.
2. `getZaverStav()` používat pro všechny kategorie standardní logiku.
3. `navrhFinale()` používat i pro Šotolinu.
4. `getCelkove()` používat standardní `celkovePoradi()`.
5. Odstranit `navrhFinaleA()` a `navrhFinaleB()` z API, nebo je dočasně nechat jako deprecated s chybou.

Akceptace fáze:

- Backend už pro žádnou kategorii negeneruje `F_A` nebo `F_B`.
- Výsledky finále Šotoliny jsou uložené jako kolo `F`.

### Fáze 4 — Sjednotit PDF/export

1. Odstranit `PORADI_SOTOLINA`.
2. Hromadný export použije stejný seznam jako ostatní RAC kategorie.
3. Odstranit `final_a_*` a `final_b_*` z běžné nabídky/exportu.
4. PDF pro Šotolinu se jmenuje `Rošty finále` a `Výsledky finále` stejně jako u ostatních kategorií.

Akceptace fáze:

- Hromadný export Šotoliny nevytvoří `Finale_A_*` ani `Finale_B_*` PDF.
- Export vytvoří `Finale_rosty.pdf` a `Finale_vysledky.pdf`.

### Fáze 5 — Úklid typů, schématu a dokumentace

1. Odebrat `SOTOLINA` z aktivních typů.
2. Odebrat `F_A/F_B` z aktivních typů.
3. Upravit DB CHECK constrainty, pokud se rozhodneme pro tvrdé odstranění legacy hodnot.
4. Upravit backup import/export.
5. Přepsat `CLAUDE.md` a uživatelský návod.

Akceptace fáze:

- `rg "SOTOLINA|F_A|F_B|Finále A|Finále B" src` najde buď 0 výskytů, nebo jen explicitně označené legacy migrační/archivní poznámky.
- Dokumentace neříká, že Šotolina má vlastní pravidla.

## Doporučená strategie pro legacy data

Jsou dvě možnosti.

### Varianta A — tvrdý cleanup

- Přemigrovat `SOTOLINA` na `STANDARD`.
- Přemigrovat hlavní staré `F_A` na `F`.
- Staré `F_B` odstranit.
- Odstranit `SOTOLINA`, `F_A`, `F_B` z typů i schématu.

Výhoda: čistý kód.

Riziko: ztráta nebo změna starých dat s Finále B.

### Varianta B — legacy read-only kompatibilita

- Nová data už nikdy nevytváří `SOTOLINA`, `F_A`, `F_B`.
- Staré hodnoty v DB schématu zůstanou dočasně povolené.
- UI je v běžném režimu neukazuje.
- Legacy data lze pouze zobrazit/exportovat v diagnostickém režimu.

Výhoda: menší riziko pro staré závody.

Nevýhoda: v kódu zůstane část legacy podpory.

Doporučení pro MVP: **Varianta B jako přechod**, po ověření záloh přejít na variantu A.

## Testovací scénáře

- Čistá instalace vytvoří kategorii `Šotolina` jako `STANDARD`.
- Nový RAC závod s kategorií Šotolina má fáze `Q1`, `Q2`, `Q3`, `Semifinále`, `Finále`, `Celkově`.
- Nikde v UI pro Šotolinu není `Finále A` ani `Finále B`.
- Stopky pro Šotolinu nabízí `F`, ne `F_A/F_B`.
- Rošt finále Šotoliny se generuje přes `navrhFinale()`.
- Výsledky finále Šotoliny se ukládají jako `kolo.typ = 'F'`.
- Hromadný PDF export Šotoliny vytvoří stejné typy PDF jako ostatní kategorie.
- Import staré zálohy se `SOTOLINA` skončí jako `STANDARD`, nebo zobrazí jasnou migrační hlášku.
- `npm run typecheck` projde po odstranění typů a API metod.

## Otevřené otázky

- Mají se stará kola `F_A` převést na `F`, nebo archivovat beze změny?
- Má se staré `F_B` mazat, ignorovat, nebo uchovat jako legacy výsledek?
- Chceme úplně odstranit `ruleset` z databáze, nebo ho ponechat pro budoucí možné odlišnosti kategorií?
- Má být `Šotolina` stále defaultní chip v RAC závodě, jen jako běžná kategorie?
- Má se zrušit tabulka `skupina`, nebo ji ponechat jako nepoužívanou legacy tabulku?
