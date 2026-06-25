# Plán — Verdict Companion

> **Stav:** budoucí produktový směr, bez implementace v repu.  
> **Kontext:** Časomíra projde rebrandingem na **Verdict**. Companion je
> tabletová aplikace pro člověka u cíle, která nahrazuje papírový zápis průjezdů.

---

## Cíl

**Verdict Companion** má zrychlit a zpřesnit dnešní workflow:

1. Člověk u cíle dnes zapisuje průjezdy aut po kolech a cílové pořadí na papír.
2. Časoměřič u PC měří časy ve stopkách.
3. Po jízdě časoměřič vezme papír a ručně přiřazuje startovní čísla k časům.

Companion má papír nahradit tabletem: zapisovatel klepá na velká startovní čísla
z aktuálního roštu a desktopový Verdict vedle stopek rovnou vidí pořadí průjezdů
i cílové pořadí.

Základní pravidlo: **Verdict desktop zůstává jediný zdroj pravdy**. Companion
jen posílá pomocná data k aktuální jízdě. Výsledky, bodování, PDF a oficiální
zápis se pořád potvrzují v desktopu.

---

## Role u závodu

| Role | Dnešní práce | S Companionem |
|------|--------------|---------------|
| **Zapisovatel u cíle** | Píše průjezdy a cílové pořadí na papír. | Klepá na startovní čísla na tabletu. |
| **Časoměřič u PC** | Měří časy a po jízdě přepisuje čísla z papíru. | Měří časy a jen kontroluje párování číslo ↔ čas. |
| **Desktop Verdict** | Oficiální evidence závodu. | Oficiální evidence závodu a zdroj roštu pro tablet. |

---

## MVP workflow

### 1. Připojení

- V desktopu se zapne **Companion režim**.
- Desktop ukáže QR kód nebo krátkou lokální adresu.
- Tablet se připojí přes stejnou Wi-Fi / hotspot počítače.
- Internet není potřeba.
- Desktop může ukázat stav: `1 tablet připojen`, baterie/poslední kontakt později.

### 2. Výběr jízdy

Preferovaný MVP model:

- aktivní jízdu vybírá časoměřič v desktopu,
- tablet ji jen následuje,
- zapisovatel na tabletu nemění závod/kategorii/fázi, aby nevznikl omyl.

Tablet zobrazí:

- závod,
- kategorii,
- fázi,
- číslo jízdy,
- rošt se startovními čísly.

### 3. Průjezdy koly

- Tablet ukazuje velká tlačítka startovních čísel podle roštu.
- Zapisovatel při každém průjezdu klepne na číslo auta.
- Companion ukládá pořadí v aktuálním kole.
- Po dokončení kola zapisovatel přepne na další kolo, nebo appka nabídne tlačítko
  **Další kolo**.
- Opakovaný klik stejného auta ve stejném kole vyvolá varování, ale musí jít
  opravit.

### 4. Cílové pořadí

MVP by měl mít jasný režim **Cíl**:

- zapisovatel přepne na `Cíl`, nebo poslední kolo označí jako cílové,
- klepání na čísla vytvoří cílové pořadí,
- desktop u stopek vidí cílové pořadí vedle naměřených časů.

### 5. Párování u časoměřiče

V okně stopek na PC:

- vlevo běží naměřené časy (`mereni`),
- vedle nich se ukáže cílové pořadí z tabletu,
- appka automaticky navrhne páry podle pořadí:
  `1. čas → 1. auto v cíli`, `2. čas → 2. auto v cíli`, atd.,
- časoměřič může pár ručně přehodit,
- teprve potom dá **Zapsat do výsledků**.

---

## Obrazovky tabletu

### Připojení

- logo/název Verdict Companion,
- stav připojení,
- pole/QR flow pro párovací kód,
- výrazná chyba, když desktop není dostupný.

### Aktivní jízda

- nahoře: `N1600 · Q2 · 2. jízda`,
- stav: `Kolo 2` nebo `Cíl`,
- velké tlačítko **Zpět** pro poslední omyl,
- mřížka startovních čísel podle roštu,
- poslední zapsané průjezdy jako krátký seznam.

### Kontrola

- seznam průjezdů po kolech,
- cílové pořadí,
- možnost smazat poslední záznam,
- možnost přehodit dvě poslední položky,
- označení problému: `neprojelo`, `nejisté`, později možná `DNF/DNS/DQ`.

### Ztráta spojení

- tablet musí jasně ukázat, že není online vůči desktopu,
- nové kliky může dočasně držet lokálně ve frontě,
- po návratu spojení se odešlou,
- desktop musí rozlišit potvrzené a dosynchronizované záznamy.

---

## Co uvidí desktop

V okně stopek by vznikl panel **Companion**:

- stav připojení tabletu,
- aktuální kolo / cílový režim,
- průjezdy posledního kola,
- cílové pořadí,
- indikace konfliktů:
  - auto v cíli není v roštu,
  - duplicitní auto ve stejném kole,
  - počet cílových průjezdů nesedí na počet naměřených časů,
  - tablet poslal data pro jinou jízdu.

Desktop nikdy nepřebírá výsledek naslepo. Companion data jsou návrh pro rychlé
přiřazení startovních čísel k naměřeným časům.

---

## Datový model — návrh

Stopky už ukládají měřené kliky do `mereni`. Průjezdy z Companionu by měly být
samostatná vrstva, aby se nemíchal časoměřičský klik s pořadím pozorovaným u cíle.

Orientační tabulka:

```sql
companion_prujezd (
  id INTEGER PRIMARY KEY,
  zavod_id INTEGER NOT NULL,
  jizda_id INTEGER NOT NULL,
  kolo_cislo INTEGER,
  typ TEXT NOT NULL,              -- LAP | FINISH | NOTE
  poradi INTEGER NOT NULL,
  jezdec_id INTEGER,
  st_cislo_raw TEXT,
  zarizeni_id TEXT,
  created_at TEXT NOT NULL,
  stav TEXT NOT NULL DEFAULT 'ACTIVE' -- ACTIVE | UNDONE
)
```

Poznámky:

- `mereni` = naměřené časy ze stopek.
- `companion_prujezd` = pořadí aut z tabletu.
- Spárování do výsledků vzniká až v desktopu při potvrzení.
- Pro audit je lepší záznamy označovat jako `UNDONE`, ne je hned fyzicky mazat.

---

## Lokální komunikace

MVP technicky:

- desktop spustí lokální HTTP/WebSocket server jen při zapnutém Companion režimu,
- tablet otevře web/PWA přes QR kód,
- WebSocket posílá stav aktivní jízdy a přijímá průjezdy,
- REST endpointy stačí pro bootstrap a fallback.

Příklad API směru:

| Směr | Událost |
|------|---------|
| Desktop → tablet | aktivní závod, kategorie, fáze, jízda, rošt |
| Tablet → desktop | přidán průjezd |
| Tablet → desktop | vrácen poslední průjezd |
| Tablet → desktop | přepnuto kolo / cíl |
| Desktop → tablet | potvrzení přijetí, stav připojení, změna jízdy |

Bezpečnost MVP:

- server vypnutý ve výchozím stavu,
- párování přes jednorázový kód v QR,
- lokální síť only,
- žádné účty, žádný cloud.

---

## Architektura V1

Pro první verzi dává nejlepší smysl **Companion načítaný z PC**:

- desktopový Verdict spustí malý lokální server,
- tablet nebo telefon se připojí přes QR kód / lokální adresu,
- Companion UI běží jako **web/PWA klient**,
- zařízení si z PC načítá aktivní jízdu, rošt a stav,
- zpět do PC posílá jen jednoduché události.

### Proč je to doporučená V1

Tahle varianta řeší několik důležitých věcí najednou:

- **jedna kódová báze** pro Android i iOS,
- nejrychlejší cesta k prototypu,
- nejmenší riziko, že postavíme drahou nativní appku pro špatný workflow,
- desktop zůstane jasný zdroj pravdy,
- pokud se něco pokazí, stačí Companion vypnout a závod běží dál bez něj.

### Co přesně běží kde

**Na PC:**

- hlavní desktopová aplikace Verdict,
- lokální Companion server,
- databáze a oficiální logika závodu,
- stopky a finální potvrzení výsledků.

**Na zařízení:**

- webová obrazovka / PWA,
- lokální UI stav,
- krátká offline fronta jen pokud bude nutná,
- žádná oficiální závodní logika.

### Co si zařízení z PC načítá

- aktivní závod,
- aktivní kategorii,
- fázi a jízdu,
- rošt jízdy,
- stav připojení,
- případně poslední průjezdy a potvrzení synchronizace.

### Co zařízení posílá zpět do PC

- průjezd auta,
- undo posledního průjezdu,
- přepnutí `Kolo` / `Cíl`,
- poznámku nebo problém,
- heartbeat / stav připojení.

### Co V1 záměrně není

V1 není:

- plně nativní Android app,
- plně nativní iOS app,
- samostatný backend mimo závodní PC,
- cloud služba,
- druhý zdroj pravdy se svojí vlastní databází.

### Budoucí rozšíření bez změny základní logiky

Pokud se workflow osvědčí, stejný frontend může později běžet i jako:

- nainstalovaná PWA,
- Android wrapper přes Capacitor,
- iOS wrapper přes Capacitor,
- případně React Native / HeroUI Native klient.

To ale až ve chvíli, kdy bude potvrzené, že UX i provozní model fungují v
reálném závodě. První investice má jít do ověření provozu, ne do platformního
balení.

### Praktický produktový závěr

**Companion má být v první verzi služba poskytovaná desktopem, ne samostatný
produkt s vlastním backendem.**

Tím si necháme otevřenou cestu pro Android i iOS, ale bez zbytečně drahého
rozdělení práce hned na začátku.

---

## Výkon a provozní rizika

Tohle je pro Companion **kritická oblast**. Ani skvělý UX nápad nesmí ohrozit
hlavní desktopový Verdict během ostrého závodu.

### Zásadní pravidlo

**Companion nesmí být bod, který zpomalí nebo destabilizuje hlavní appku.**

Když se tablet odpojí, zamrzne nebo pošle chybná data:

- desktopový Verdict musí dál normálně měřit,
- stopky musí zůstat okamžitě ovladatelné,
- výsledky musí jít dokončit i bez Companionu,
- nejhorší fallback je „vrátíme se k papíru", ne „spadl závodní počítač".

### Co samo o sobě výkon pravděpodobně nezabije

Malý lokální server pro 1 tablet je sám o sobě obvykle levná věc. Pokud dělá jen:

- drží jedno lokální spojení,
- pošle rošt a aktivní jízdu,
- přijímá kliky průjezdů,
- uloží drobné záznamy do DB,

tak by proti Electron appce, renderingu a běžné práci s tabulkami měl mít malý
dopad.

### Co naopak výkon nebo stabilitu ohrozit může

- přepočet výsledků po každém jednom průjezdu,
- broadcast celé aplikace po každém kliknutí,
- zápis těžké logiky do hlavního Electron procesu bez oddělení,
- překreslení celé obrazovky stopek při každé malé změně,
- příliš časté nebo neefektivní zápisy do SQLite,
- fronta chyb/retry, která začne zahlcovat hlavní UI.

### Guardraily pro MVP

První verze by měla mít tato omezení:

- **1 aktivní tablet**
- **1 aktivní jízda**
- **bez živého přepočtu výsledků**
- **bez cloudu**
- **bez více operátorů**
- **bez automatického rozhodování**

Companion v MVP jen:

- přijímá stav aktivní jízdy,
- posílá události typu `průjezd`, `undo`, `kolo`, `cíl`,
- ukládá je jako pomocná data,
- nabídne desktopu návrh párování.

### Doporučený architektonický princip

Companion server má být **tenká událostní vrstva**, ne druhý mozek aplikace.

To znamená:

- žádné bodování na serveru,
- žádný výpočet klasifikace po každém kliku,
- žádné těžké dotazy při každém průjezdu,
- žádné UI blokující synchronní operace ve chvíli, kdy běží stopky.

Desktop si má těžší logiku nechat až na okamžiky, kdy to dává smysl:

- potvrzení cílového pořadí,
- přechod na další kolo,
- párování časů,
- zápis do výsledků.

### Fail-safe chování

Při výpadku Wi-Fi nebo tablet appky:

- desktop jasně ukáže `Companion odpojen`,
- stopky a lokální práce běží dál bez omezení,
- časoměřič může kdykoli dokončit jízdu ručně bez Companionu,
- žádná část desktopu nesmí čekat na odpověď tabletu, aby šla dál.

Při chybných datech z tabletu:

- desktop je bere jako návrh, ne jako pravdu,
- konflikty ukáže viditelně,
- finální potvrzení zůstane na časoměřiči.

### Co ověřit v prototypu dřív než „krásné UI"

Ještě před větší investicí do Android/native směru ověřit:

1. jestli 1 tablet + 1 desktop běží plynule na reálném závodním notebooku,
2. jestli při 8–10 autech a rychlém klikání nedochází k lagům,
3. jestli odpojení tabletu nijak nerozbije stopky,
4. jestli je fallback na ruční práci okamžitý a srozumitelný.

### Praktický závěr pro MVP

Pokud by Companion znamenal byť jen malé riziko, že stopky budou „těžší",
zasekané nebo méně důvěryhodné, je potřeba scope zmenšit. Výkon a provozní
spolehlivost mají přednost před šíří funkcí.

---

## Design zásady

- Primárně **tablet landscape**.
- Velká startovní čísla, použitelná v rukavicích / ve stresu.
- Minimum textu při samotném zápisu.
- Jasné stavy: připojeno, offline, synchronizováno, chyba.
- Jedno velké **Zpět** pro poslední omyl.
- Žádné bodování, žádné složité tabulky, žádné nastavování závodu na tabletu.
- Vizuálně rodina Verdictu: stejné názvosloví, logo, light/dark, podobné tokeny.
- Ergonomie jiná než desktop: desktop je kontrolní nástroj, tablet je rychlý
  zapisovací panel.

---

## Hranice MVP

V první verzi nedělat:

- plnou Android APK,
- editaci výsledků na tabletu,
- bodování a pravidla na tabletu,
- více souběžných tabletů,
- cloud synchronizaci,
- divácký live web,
- automatické rozhodování DNF/DNS/DQ bez potvrzení v desktopu.

MVP má ověřit jedinou věc: **umí tablet spolehlivě nahradit papír u cíle a zrychlit
přiřazení startovních čísel k časům?**

---

## Doporučený postup

1. Vytvořit samostatné repo **`verdict-companion`** pro tabletový prototyp.
2. Udělat React + Vite prototyp s mock daty a designem podle Verdictu.
3. Ověřit workflow na stole: klikání průjezdů, undo, cílové pořadí.
4. V desktopu Verdict navrhnout lokální Companion server a QR párování.
5. Přidat read-only panel Companion do okna stopek.
6. Přidat ukládání průjezdů do DB.
7. Teprve potom řešit PWA/offline frontu a případně Android wrapper přes Capacitor.

---

## Otevřené otázky

- Kolik kol se typicky zapisuje pro Q/SF/F a liší se podle závodu?
- Má tablet vždy jen následovat aktivní jízdu z desktopu, nebo smí jízdu vybrat?
- Má se cílové pořadí řešit samostatným režimem `Cíl`, nebo posledním kolem?
- Má zapisovatel na tabletu značit i `DNF/DNS/DQ`, nebo jen poznámku „problém“?
- Má MVP podporovat frontu při výpadku Wi-Fi hned, nebo až po prvním ověření?
- Má být první test jen web/PWA v prohlížeči, nebo rovnou Android tablet wrapper?

---

## Shrnutí jednou větou

**Verdict Companion je tabletový digitální papír u cíle: bere rošt z desktopu,
zapisuje průjezdy a cílové pořadí, a desktopovému Verdictu pomáhá rychle spárovat
naměřené časy se startovními čísly bez ručního přepisování.**
