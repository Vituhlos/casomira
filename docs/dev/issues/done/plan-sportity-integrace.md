# Implementační plán integrace Časomíry se Sportity API

Tento dokument shrnuje návrh integrace desktopové aplikace **Časomíra** se službou **Sportity** (`admin.sportity.com`) přes jejich API. Cílem je umožnit časomíře publikovat vygenerované PDF výstupy do existující stromové struktury Sportity bez narušení lokálního/offline workflow aplikace.

> Stav: plán a návrh architektury, ne implementace.
> Navazující backlog issue: [`docs/dev/issues/001-sportity-integrace.md`](./issues/001-sportity-integrace.md).

---

## 1. Kontext a cíl

Časomíra je podle současného zadání desktopová aplikace pro jednoho operátora, jeden počítač a plně lokální práci. Data jsou uložena v lokální SQLite databázi. Integrace se Sportity proto nemá změnit základní princip aplikace na online systém, ale má fungovat jako **publikační nadstavba**:

- časomíra dál funguje lokálně a offline,
- výsledky, rošty a startovní listiny se počítají a exportují lokálně,
- operátor může vybrané PDF výstupy ručně nebo hromadně publikovat do Sportity,
- při výpadku internetu se závod ani lokální workflow nerozbije.

Integrace má primárně spravovat dokumenty v sekci **Výsledky** daného Sportity channelu.

---

## 2. Struktura Sportity podle screenshotů

Ze screenshotů vyplývá, že Sportity používá tuto hierarchii:

```text
Sportity Channel
└── závod / podnik / termín
    ├── Organizace
    ├── Rozhodnutí
    ├── Výsledky
    │   ├── Junior
    │   ├── N1400
    │   ├── N1600
    │   │   ├── Startovní listina
    │   │   ├── Rošty Q1
    │   │   ├── Rošty Q2
    │   │   ├── Výsledky Q1
    │   │   ├── Výsledky Q2
    │   │   ├── Rošty Q3
    │   │   ├── Celkově po Q2
    │   │   ├── Výsledky Q3
    │   │   ├── Celkově po Q3
    │   │   ├── Rošty finále
    │   │   ├── Výsledky finále
    │   │   └── Celkové výsledky
    │   ├── N1600+
    │   ├── Škoda Cup
    │   └── ...
    └── Ostatní
```

Konkrétní příklad pro `RAC race Sedlčany 2026`:

```text
RAC race Sedlčany 2026
├── 01-Sedlčany 25.04.
├── 02-Sedlčany 23.05.
├── 03-Sedlčany 27.06.
├── 04-Sedlčany 12.07.
├── 05-Sedlčany 12.09.
└── 06-Silvestr Sedlčany 31.12.
```

Uvnitř jednoho termínu:

```text
01-Sedlčany 25.04.
├── 01-01 Organizace
├── 01-02 Rozhodnutí
├── 01-03 Výsledky
│   ├── Junior
│   ├── N1400
│   ├── N1600
│   ├── N1600+
│   ├── Škoda Cup
│   ├── S1400
│   ├── S1600
│   ├── S1600+
│   ├── Cross Cup
│   ├── Dámský pohár do 1400
│   ├── Dámský pohár nad 1400
│   └── Šotolina
└── 01-04 Ostatní
```

Z toho plyne důležité rozhodnutí: Časomíra nebude publikovat dokumenty „někam do eventu“, ale do konkrétní složky:

```text
Sportity channel / složka termínu / 01-03 Výsledky / kategorie
```

---

## 3. Terminologie

Aby se předešlo záměně mezi lokálními závody v Časomíře a Sportity strukturou, doporučené pojmy jsou:

| Pojem v Časomíře | Pojem ve Sportity | Význam |
| --- | --- | --- |
| Závod | Channel + round folder | Lokální závod se mapuje na Sportity channel a konkrétní termínovou složku. |
| Kategorie | Category folder | Lokální kategorie se mapuje na složku kategorie pod `Výsledky`. |
| PDF list / `ListKey` | Document | Jeden tiskový výstup Časomíry je jeden PDF dokument ve Sportity. |
| Hromadný PDF export | Bulk publish | Hromadné vytvoření/aktualizace dokumentů ve Sportity. |

Doporučený model vazeb:

```text
lokální závod Časomíra
→ Sportity channel
→ Sportity round folder
→ Sportity results folder

lokální kategorie
→ Sportity category folder

lokální ListKey
→ Sportity PDF document
```

---

## 4. Hlavní architektonické rozhodnutí

Sportity API klient má být implementovaný výhradně v Electron **main procesu**, ne v React rendereru.

Důvody:

- API key nesmí být dostupný v rendereru ani v DevTools.
- Renderer má komunikovat pouze přes bezpečný preload bridge `window.api`.
- Main proces už dnes řeší přístup k databázi, disku, PDF exportu a nativním dialogům.
- Stejný vzor se použije i pro Sportity.

Navržené nové soubory:

```text
src/main/sportity/client.ts
src/main/sportity/service.ts
src/main/sportity/types.ts
```

Role souborů:

- `client.ts` — nízkoúrovňový HTTP klient Sportity API,
- `service.ts` — aplikační logika mapování, párování, publikování a logování,
- `types.ts` — interní typy Sportity requestů/response.

Rozšířené existující soubory:

```text
src/shared/types.ts
src/preload/index.ts
src/main/ipc.ts
src/main/db/migrate.ts
src/main/repo.ts
src/main/pdf.ts
src/renderer/src/screens/Settings.tsx
```

---

## 5. Bezpečné uložení API key

API key je citlivý údaj. Doporučené řešení pro MVP:

1. API key nikdy neposílat do rendereru po uložení.
2. V rendereru ukazovat jen maskovaný stav, např. `uložen klíč končící ...ABCD`.
3. V main procesu API key zašifrovat přes Electron `safeStorage`.
4. Zašifrovanou hodnotu uložit do existující tabulky `nastaveni`, případně do nového specializovaného nastavení.

Alternativně lze později použít OS keychain přes specializovaný balíček, ale pro MVP je `safeStorage` jednodušší.

Doporučené klíče v nastavení:

```text
sportity.api_key.encrypted
sportity.last_channel_id
sportity.last_round_folder_id
sportity.last_results_folder_id
```

---

## 6. Navržené databázové tabulky

### 6.1 Mapování Sportity channelu

```sql
CREATE TABLE sportity_channel_map (
  zavod_id INTEGER PRIMARY KEY REFERENCES zavod(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_password TEXT,
  updated_at TEXT NOT NULL
);
```

Účel:

- mapuje lokální závod na Sportity channel,
- ukládá název channelu pro zobrazení,
- volitelně ukládá password channelu jen jako informaci pro obsluhu, ne pro API auth.

### 6.2 Mapování složek

```sql
CREATE TABLE sportity_folder_map (
  id INTEGER PRIMARY KEY,
  zavod_id INTEGER NOT NULL REFERENCES zavod(id) ON DELETE CASCADE,
  kategorie_id INTEGER REFERENCES kategorie(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  sportity_folder_id TEXT NOT NULL,
  sportity_folder_name TEXT NOT NULL,
  parent_folder_id TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE (zavod_id, kategorie_id, role)
);
```

Možné hodnoty `role`:

```ts
type SportityFolderRole =
  | 'round'
  | 'organization'
  | 'decisions'
  | 'results'
  | 'other'
  | 'category'
```

Pro první verzi jsou klíčové hlavně:

- `round`,
- `results`,
- `category`.

### 6.3 Mapování dokumentů

```sql
CREATE TABLE sportity_document_map (
  id INTEGER PRIMARY KEY,
  zavod_id INTEGER NOT NULL REFERENCES zavod(id) ON DELETE CASCADE,
  kategorie_id INTEGER NOT NULL REFERENCES kategorie(id) ON DELETE CASCADE,
  list_key TEXT NOT NULL,
  sportity_document_id TEXT NOT NULL,
  sportity_document_name TEXT NOT NULL,
  parent_folder_id TEXT NOT NULL,
  checksum TEXT,
  last_published_at TEXT NOT NULL,
  UNIQUE (zavod_id, kategorie_id, list_key)
);
```

Účel:

- umožnit aktualizovat existující dokument místo vytváření duplicit,
- uložit checksum poslední publikované verze,
- spojit konkrétní `ListKey` s dokumentem ve Sportity.

### 6.4 Publish log

```sql
CREATE TABLE sportity_publish_log (
  id INTEGER PRIMARY KEY,
  zavod_id INTEGER REFERENCES zavod(id) ON DELETE CASCADE,
  kategorie_id INTEGER REFERENCES kategorie(id) ON DELETE CASCADE,
  list_key TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);
```

Možné hodnoty:

```ts
type SportityPublishAction =
  | 'test_connection'
  | 'list_channels'
  | 'map_channel'
  | 'map_folder'
  | 'create_document'
  | 'update_document'
  | 'skip_unchanged'
  | 'delete_document'

type SportityPublishStatus =
  | 'success'
  | 'failed'
  | 'warning'
```

---

## 7. Sportity API klient

Navržené rozhraní klienta:

```ts
export class SportityClient {
  constructor(private readonly apiKey: string) {}

  listChannels(): Promise<SportityChannel[]>
  listActiveChannels(): Promise<SportityChannel[]>
  listPastChannels(): Promise<SportityChannel[]>
  listArchivedChannels(): Promise<SportityChannel[]>

  listDocuments(channelId: string): Promise<SportityDocument[]>
  listDocumentTree(channelId: string): Promise<SportityNode[]>
  listChildren(channelId: string, parentId: string | null): Promise<SportityNode[]>

  createFolder(input: CreateFolderInput): Promise<SportityDocument>
  createPdfDocument(input: CreatePdfDocumentInput): Promise<SportityDocument>
  createTextDocument(input: CreateTextDocumentInput): Promise<SportityDocument>
  createImageDocument(input: CreateImageDocumentInput): Promise<SportityDocument>
  createLinkDocument(input: CreateLinkDocumentInput): Promise<SportityDocument>

  updateDocument(id: string, input: UpdateDocumentInput): Promise<SportityDocument>
  replacePdfDocument(id: string, input: ReplacePdfDocumentInput): Promise<SportityDocument>
  deleteDocument(id: string): Promise<void>
  reorderDocument(input: ReorderDocumentInput): Promise<void>
}
```

Přesné názvy metod a payloadů je nutné doladit podle reálné Sportity API dokumentace.

Klient musí řešit:

- timeouty,
- chybové HTTP statusy,
- sanitizované logování bez API key,
- retry pro 429/5xx,
- validaci response,
- upload PDF souborů,
- rozlišení create vs. update.

---

## 8. Sdílené typy pro UI

Do `src/shared/types.ts` přidat například:

```ts
export interface SportityChannel {
  id: string
  name: string
  password?: string
  status: 'active' | 'past' | 'trash' | 'archived'
}

export interface SportityNode {
  id: string
  parentId: string | null
  type: 'folder' | 'pdf' | 'text' | 'image' | 'link'
  title: string
  children?: SportityNode[]
}

export interface SportityMapping {
  zavodId: number
  channelId: string
  channelName: string
  roundFolderId: string
  roundFolderName: string
  resultsFolderId: string
  resultsFolderName: string
}

export interface SportityCategoryMapping {
  kategorieId: number
  kategorieNazev: string
  folderId: string | null
  folderName: string | null
  stav: 'mapped' | 'missing' | 'manual' | 'created'
}

export interface SportityPublishOptions {
  createMissingFolders?: boolean
  createMissingDocuments?: boolean
  skipUnchanged?: boolean
  dryRun?: boolean
}

export interface SportityPublishItemResult {
  kategorieId: number
  listKey: ListKey
  title: string
  status: 'created' | 'updated' | 'skipped' | 'failed'
  message?: string
}

export interface SportityPublishResult {
  ok: boolean
  created: number
  updated: number
  skipped: number
  failed: number
  items: SportityPublishItemResult[]
}
```

Rozšíření `CasomiraApi`:

```ts
export interface CasomiraApi {
  // ...existující metody...

  getSportitySettings(): Promise<SportitySettingsView>
  saveSportityApiKey(apiKey: string): Promise<void>
  clearSportityApiKey(): Promise<void>
  testSportityConnection(): Promise<SportityConnectionResult>

  sportityListChannels(): Promise<SportityChannel[]>
  sportityListDocumentTree(channelId: string): Promise<SportityNode[]>

  sportitySaveMapping(mapping: SportityMapping): Promise<void>
  sportityAutoMapCategories(zavodId: number): Promise<SportityCategoryMapping[]>
  sportitySaveCategoryMapping(mapping: SportityCategoryMapping): Promise<void>

  sportityPublishList(
    kategorieId: number,
    listKey: ListKey,
    options?: SportityPublishOptions
  ): Promise<SportityPublishResult>

  sportityPublishCategory(
    kategorieId: number,
    options?: SportityPublishOptions
  ): Promise<SportityPublishResult>

  sportityPublishRace(
    zavodId: number,
    kategorieIds: number[],
    options?: SportityPublishOptions
  ): Promise<SportityPublishResult>
}
```

---

## 9. IPC kanály

Do `src/main/ipc.ts` přidat handlery typu:

```ts
ipcMain.handle('sportity:settings:get', ...)
ipcMain.handle('sportity:apiKey:save', ...)
ipcMain.handle('sportity:apiKey:clear', ...)
ipcMain.handle('sportity:test', ...)

ipcMain.handle('sportity:channels:list', ...)
ipcMain.handle('sportity:tree:list', ...)

ipcMain.handle('sportity:mapping:save', ...)
ipcMain.handle('sportity:categories:autoMap', ...)
ipcMain.handle('sportity:categories:saveMap', ...)

ipcMain.handle('sportity:publish:list', ...)
ipcMain.handle('sportity:publish:category', ...)
ipcMain.handle('sportity:publish:race', ...)
```

Do `src/preload/index.ts` přidat odpovídající metody do `window.api`.

---

## 10. Názvy dokumentů ve Sportity

PDF nadpisy v Časomíře mohou být delší a formálnější, ale ve Sportity je vhodné používat krátké názvy odpovídající screenshotům.

Doporučený slovník:

```ts
const SPORTITY_DOCUMENT_TITLE: Record<ListKey, string> = {
  start: 'Startovní listina',
  grid_q1: 'Rošty Q1',
  grid_q2: 'Rošty Q2',
  grid_q3: 'Rošty Q3',
  res_q1: 'Výsledky Q1',
  res_q2: 'Výsledky Q2',
  res_q3: 'Výsledky Q3',
  res_q1_agg: 'Celkově po Q1',
  res_q2_agg: 'Celkově po Q2',
  class_q2: 'Celkově po Q2',
  class_q3: 'Celkově po Q3',
  sf_rost: 'Rošty semifinále',
  sf_res: 'Výsledky semifinále',
  final_rost: 'Rošty finále',
  final_res: 'Výsledky finále',
  final_b_rost: 'Rošty finále B',
  final_b_res: 'Výsledky finále B',
  final_a_rost: 'Rošty finále A',
  final_a_res: 'Výsledky finále A',
  overall: 'Celkové výsledky'
}
```

Poznámka: `res_q2_agg` a `class_q2` mohou vést na podobný význam. Před implementací je potřeba rozhodnout, který list se má ve Sportity jmenovat `Celkově po Q2`, aby nevznikly duplicity.

---

## 11. Výchozí publikační sady

### 11.1 Standardní RAC/RX bez semifinále

```ts
const DEFAULT_STANDARD_SPORTITY_LISTS: ListKey[] = [
  'start',
  'grid_q1',
  'grid_q2',
  'res_q1',
  'res_q2',
  'grid_q3',
  'class_q2',
  'res_q3',
  'class_q3',
  'final_rost',
  'final_res',
  'overall'
]
```

### 11.2 Standardní RAC/RX se semifinále

```ts
const DEFAULT_STANDARD_WITH_SF_SPORTITY_LISTS: ListKey[] = [
  'start',
  'grid_q1',
  'grid_q2',
  'res_q1',
  'res_q2',
  'grid_q3',
  'class_q2',
  'res_q3',
  'class_q3',
  'sf_rost',
  'sf_res',
  'final_rost',
  'final_res',
  'overall'
]
```

### 11.3 Šotolina

```ts
const DEFAULT_SOTOLINA_SPORTITY_LISTS: ListKey[] = [
  'start',
  'grid_q1',
  'grid_q2',
  'res_q1',
  'res_q2',
  'grid_q3',
  'class_q2',
  'res_q3',
  'class_q3',
  'final_b_rost',
  'final_b_res',
  'final_a_rost',
  'final_a_res',
  'overall'
]
```

---

## 12. Publikační algoritmus

### 12.1 Publikování jednoho listu

Příklad: `N1600 → Výsledky Q2`.

1. Najít lokální kategorii `N1600`.
2. Najít její Sportity category folder ID.
3. Převést `listKey` na Sportity název dokumentu, např. `res_q2 → Výsledky Q2`.
4. Vygenerovat PDF do bufferu nebo dočasného souboru.
5. Spočítat checksum PDF.
6. Zkontrolovat `sportity_document_map`.
7. Pokud mapování existuje:
   - pokud checksum sedí, přeskočit upload,
   - jinak aktualizovat existující dokument.
8. Pokud mapování neexistuje:
   - načíst dokumenty ve Sportity category folderu,
   - zkusit najít dokument podle názvu,
   - pokud existuje, spárovat a aktualizovat,
   - pokud neexistuje, vytvořit nový dokument.
9. Uložit/aktualizovat `sportity_document_map`.
10. Zapsat výsledek do `sportity_publish_log`.

### 12.2 Hromadné publikování kategorie

1. Zjistit ruleset kategorie.
2. Vybrat výchozí publikační sadu podle rulesetu a stavu závodu.
3. Pro každý `ListKey` spustit algoritmus publikování jednoho listu.
4. Vrátit souhrn:
   - vytvořeno,
   - aktualizováno,
   - přeskočeno,
   - selhalo.

### 12.3 Hromadné publikování závodu

1. Uživatel vybere kategorie.
2. Appka ověří, že všechny vybrané kategorie mají Sportity folder mapping.
3. Kategorie bez mapování označí jako problém.
4. Publikuje kategorii po kategorii.
5. Zobrazí detailní výsledek.

---

## 13. Prevence duplicit

Nejdůležitější pravidlo: **nevytvářet nový dokument, pokud už ve Sportity existuje dokument se stejným významem**.

Při první publikaci je potřeba:

1. Načíst dokumenty v cílové Sportity složce kategorie.
2. Spárovat podle názvu:
   - `Startovní listina`,
   - `Rošty Q1`,
   - `Výsledky Q1`,
   - atd.
3. Zobrazit náhled:

```text
Startovní listina       nalezeno, bude aktualizováno
Rošty Q1                nalezeno, bude aktualizováno
Výsledky Q1             nenalezeno, bude vytvořeno
Celkové výsledky        nalezeno, bude aktualizováno
```

4. Teprve po potvrzení publikovat.

Pokud Sportity API neumí nahradit PDF soubor u existujícího dokumentu, musí se rozhodnout mezi:

- smazat a znovu vytvořit dokument,
- vytvořit novou verzi s upraveným názvem,
- nebo ponechat ruční update přes admin UI.

Preferované řešení je update/replace existujícího dokumentu.

---

## 14. UI návrh

### 14.1 Sekce Sportity v Nastavení

Navržený obsah:

```text
Sportity

API key: uložen / neuložen
[Změnit API key] [Smazat API key] [Test spojení]

Kanál:
[RAC race Sedlčany 2026          v]

Složka závodu:
[01-Sedlčany 25.04.              v]

Složka výsledků:
[01-03 Výsledky                  v]

Mapování kategorií:
Junior                   → Junior                   ✓
N1400                    → N1400                    ✓
N1600                    → N1600                    ✓
N1600+                   → N1600+                   ✓
Šotolina                 → Šotolina                 ✓
Dámský pohár do 1400     → nenalezeno               [Vybrat] [Vytvořit]
```

Akce:

- `Načíst kanály`,
- `Načíst strom`,
- `Automaticky spárovat kategorie`,
- `Publikovat vybrané kategorie`,
- `Zobrazit log publikování`.

### 14.2 Menu u PDF exportu

U tlačítka PDF přidat položky:

```text
Uložit PDF
Uložit jako…
Publikovat tento list do Sportity
Uložit PDF a publikovat
Publikovat kategorii do Sportity
Publikovat vše do Sportity
```

### 14.3 Modal hromadného publikování

```text
Publikovat do Sportity

Cíl:
RAC race Sedlčany 2026 / 01-Sedlčany 25.04. / 01-03 Výsledky

Kategorie:
[x] Junior
[x] N1400
[x] N1600
[x] N1600+
[ ] Šotolina

Dokumenty:
[x] Startovní listina
[x] Rošty Q1
[x] Výsledky Q1
[x] Rošty Q2
[x] Výsledky Q2
[x] Rošty Q3
[x] Výsledky Q3
[x] Celkové výsledky

[Publikovat]
```

### 14.4 Publish status

U dokumentů nebo v Nastavení ukazovat:

- `nikdy nepublikováno`,
- `publikováno dnes v 15:42`,
- `změněno od poslední publikace`,
- `chyba při posledním pokusu`,
- `cílová složka nenalezena`.

---

## 15. Offline-first chování

Sportity integrace musí být best-effort:

- Když není internet, lokální závod pokračuje.
- Selhání publikování nesmí změnit výsledky ani lokální data závodu.
- Chyba publikování se zapíše do logu.
- Operátor může publikování opakovat.
- Automatické publikování by nemělo být výchozí.

Doporučení:

- První verze bez složité fronty.
- Přidat jen log posledních pokusů.
- Později lze přidat frontu `pending/running/success/failed`.

---

## 16. Bezpečnostní pravidla

- API key nikdy neposílat do rendereru po uložení.
- API key nikdy nelogovat.
- V UI zobrazovat jen maskovanou podobu.
- Při testu spojení zobrazit stručnou chybu bez citlivých detailů.
- Sanitizovat všechny logy requestů.
- Před hromadným uploadem ukázat potvrzení, kolik dokumentů se vytvoří/aktualizuje.
- U uploadu počítat checksum.
- Při konfliktu názvů nabídnout ruční spárování.

---

## 17. Implementační fáze

### Fáze 0 — Ověření Sportity API kontraktu

Cíl: ověřit skutečné endpointy před integrací do UI.

Úkoly:

- získat testovací API key,
- ověřit base URL,
- ověřit auth header,
- ověřit list channels,
- ověřit list documents/tree,
- ověřit create folder,
- ověřit create PDF document,
- ověřit update/replace PDF document,
- ověřit delete document,
- ověřit reorder,
- ověřit limity velikosti PDF,
- ověřit rate limit.

Výstup:

- potvrzené TypeScript typy,
- testovací skript nebo izolovaný klient,
- rozhodnutí, jestli API umí nahradit existující PDF.

### Fáze 1 — Konfigurace v aplikaci

Úkoly:

- přidat Sportity typy,
- přidat secure uložení API key,
- přidat IPC handlery,
- přidat preload metody,
- přidat sekci Sportity v Nastavení,
- test spojení,
- načtení channels.

Výstup:

- operátor umí uložit API key,
- vidí aktivní channels,
- umí ověřit spojení.

### Fáze 2 — Mapování Sportity stromu

Úkoly:

- přidat DB migrace pro mapování,
- načíst document tree channelu,
- vybrat round folder,
- vybrat results folder,
- automaticky spárovat kategorie podle názvu,
- uložit category folder mapping.

Výstup:

- lokální závod je spárovaný s konkrétní složkou Sportity výsledků,
- kategorie jsou spárované se Sportity složkami.

### Fáze 3 — Publikování jedné kategorie

Úkoly:

- doplnit generování PDF jako buffer/temp file,
- implementovat publish jednoho listu,
- implementovat publish celé kategorie,
- párovat existující dokumenty podle názvu,
- ukládat document mapping,
- zapisovat publish log.

Výstup:

- operátor umí publikovat jednu kategorii do Sportity.

### Fáze 4 — Hromadné publikování

Úkoly:

- modal pro výběr kategorií a dokumentů,
- progress publikování,
- souhrn výsledků,
- možnost publikovat jen změněné dokumenty.

Výstup:

- operátor umí publikovat všechny výsledky vybraných kategorií.

### Fáze 5 — Pokročilé funkce

Možné doplňky:

- vytváření chybějících category folders,
- vytváření celé struktury `Organizace / Rozhodnutí / Výsledky / Ostatní`,
- reorder dokumentů,
- oprava mapování při ručním smazání dokumentu ve Sportity,
- fronta publikování,
- automatické publikování po PDF exportu,
- publish status přímo u jednotlivých listů.

---

## 18. Doporučené MVP

Pro první produkčně použitelnou verzi doporučuji tento rozsah:

1. API key v Nastavení.
2. Test spojení.
3. Výběr Sportity channelu.
4. Výběr termínové složky.
5. Výběr složky `Výsledky`.
6. Automatické spárování kategorií podle názvu.
7. Ruční korekce mapování kategorií.
8. Publikování jedné kategorie.
9. Hromadné publikování vybraných kategorií.
10. Update existujících dokumentů místo tvorby duplicit.
11. Publish log.

Naopak do MVP nedávat:

- automatický upload po každé změně výsledků,
- synchronizaci dat ze Sportity zpět do Časomíry,
- správu Organizace/Rozhodnutí/Ostatní,
- personální/access log,
- složitou retry frontu,
- mazání dokumentů ve Sportity jako běžnou operaci.

---

## 19. Doporučený workflow pro časoměřiče

### Před závodem

1. Ve Sportity adminu je připravený channel.
2. Ve Sportity adminu je připravená termínová složka.
3. Ve Sportity adminu je připravená složka `Výsledky` a podsložky kategorií.
4. V Časomíře operátor propojí závod se Sportity.
5. Časomíra automaticky spáruje kategorie.

### V den závodu

1. Po importu jezdců: `Publikovat startovní listiny`.
2. Po vytvoření roštů Q1: `Publikovat rošty Q1`.
3. Po dojetí Q1: `Publikovat výsledky Q1`.
4. Po dalších sériích: opakovat podle potřeby.
5. Na konci: `Publikovat vše změněné`.

Důležité: výsledky publikovat vědomě po kontrole, ne automaticky při každé změně času.

---

## 20. Otevřené otázky

Před implementací je potřeba ověřit:

1. Jak přesně Sportity API pojmenovává channel/event/document?
2. Jaký endpoint vrací strom dokumentů?
3. Jak se v API pozná folder vs. PDF document?
4. Jak se předává `parent_id` při vytvoření dokumentu?
5. Jak přesně probíhá PDF upload?
6. Umí API nahradit soubor u existujícího dokumentu?
7. Pokud ne, je bezpečné dokument smazat a vytvořit znovu?
8. Jsou názvy dokumentů ve složce unikátní?
9. Funguje reorder přes API i pro dokumenty ve folderu?
10. Jaké jsou limity velikosti dokumentů?
11. Jaké jsou rate limity?
12. Má API přístup ke všem channelům účtu, nebo jen k vybraným?
13. Vrací API archived/trash channels odděleně?
14. Je možné přes API zjistit channel password, nebo ho API nevrací?
15. Jak Sportity API reportuje smazaný dokument?

---

## 21. Shrnutí rozhodnutí

- Časomíra zůstane lokální/offline-first aplikace.
- Sportity bude publikační integrace, ne zdroj pravdy.
- API klient poběží pouze v Electron main procesu.
- API key nebude dostupný rendereru.
- Mapování bude na úrovni channelu, složky termínu, složky výsledků, složek kategorií a dokumentů.
- Časomíra bude spravovat hlavně `Výsledky / <Kategorie>`.
- Při první publikaci se existující Sportity dokumenty spárují podle názvu.
- Následná publikace aktualizuje existující dokumenty, aby nevznikaly duplicity.
- Hromadné publikování bude ruční a potvrzené operátorem.
- Automatický upload po každé změně není vhodný pro MVP.
