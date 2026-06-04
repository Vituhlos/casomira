# Issue 001 — Integrace se Sportity API

## Stav

Plánováno.

## Cíl

Umožnit z Časomíry publikovat PDF výstupy do existující struktury na `admin.sportity.com`, hlavně do sekce:

```text
Sportity channel / složka závodu / 01-03 Výsledky / kategorie
```

Časomíra zůstává offline-first desktopová aplikace. Sportity je pouze publikační nadstavba, ne zdroj pravdy.

## Kontext

Sportity struktura podle screenshotů:

```text
RAC race Sedlčany 2026
├── 01-Sedlčany 25.04.
│   ├── 01-01 Organizace
│   ├── 01-02 Rozhodnutí
│   ├── 01-03 Výsledky
│   │   ├── Junior
│   │   ├── N1400
│   │   ├── N1600
│   │   │   ├── Startovní listina
│   │   │   ├── Rošty Q1
│   │   │   ├── Rošty Q2
│   │   │   ├── Výsledky Q1
│   │   │   ├── Výsledky Q2
│   │   │   ├── Rošty Q3
│   │   │   ├── Celkově po Q2
│   │   │   ├── Výsledky Q3
│   │   │   ├── Celkově po Q3
│   │   │   ├── Rošty finále
│   │   │   ├── Výsledky finále
│   │   │   └── Celkové výsledky
│   │   └── ...
│   └── 01-04 Ostatní
└── další termíny
```

Podrobný design dokument je tady:

- [`docs/dev/plan-sportity-integrace.md`](../plan-sportity-integrace.md)

## MVP rozsah

### Musí být

- Uložit Sportity API key bezpečně v Electron main procesu.
- Test spojení se Sportity API.
- Načíst Sportity channels.
- Vybrat channel, termínovou složku a složku `Výsledky`.
- Automaticky spárovat lokální kategorie se Sportity složkami podle názvu.
- Umožnit ruční opravu mapování kategorií.
- Publikovat jednu kategorii.
- Hromadně publikovat vybrané kategorie.
- Aktualizovat existující dokumenty místo vytváření duplicit.
- Zapsat publish log.

### Nemusí být v MVP

- Automatický upload při každé změně výsledků.
- Synchronizace ze Sportity zpět do Časomíry.
- Správa složek `Organizace`, `Rozhodnutí`, `Ostatní`.
- Access/personnel log ze Sportity.
- Složitá retry fronta.
- Běžné mazání Sportity dokumentů z Časomíry.

## Navržené technické kroky

### 1. Ověření Sportity API

- Ověřit auth header a base URL.
- Ověřit endpoint pro list channels.
- Ověřit endpoint pro strom dokumentů/složek.
- Ověřit upload PDF.
- Ověřit update/replace existujícího PDF dokumentu.
- Ověřit limity velikosti dokumentů a rate limity.

### 2. Main-process klient

Přidat:

```text
src/main/sportity/client.ts
src/main/sportity/service.ts
src/main/sportity/types.ts
```

Sportity API key nesmí být dostupný v rendereru.

### 3. Databázové mapování

Přidat migraci pro:

- `sportity_channel_map`,
- `sportity_folder_map`,
- `sportity_document_map`,
- `sportity_publish_log`.

### 4. IPC a preload

Rozšířit:

```text
src/shared/types.ts
src/preload/index.ts
src/main/ipc.ts
```

Nové metody budou přístupné přes `window.api`, ale bez předání API key do rendereru.

### 5. PDF buffer pro upload

Rozšířit PDF modul tak, aby uměl vrátit PDF jako buffer nebo dočasný soubor pro upload do Sportity.

### 6. UI

V `Nastavení` přidat sekci Sportity:

- API key,
- test spojení,
- výběr channelu,
- výběr termínové složky,
- výběr složky `Výsledky`,
- mapování kategorií,
- publish log.

Doplnit akce:

- publikovat aktuální list,
- publikovat kategorii,
- publikovat vybrané kategorie.

## Akceptační kritéria

- Bez API key se v UI zobrazí jasný stav „Sportity není nastavené“.
- Po uložení API key lze otestovat spojení.
- Uživatel vybere channel a cílovou složku výsledků.
- Aplikace automaticky spáruje kategorie se složkami podle názvu.
- Publikování dokumentu nevytvoří duplicitu, pokud už dokument se stejným názvem existuje.
- Opakované publikování stejného listu aktualizuje existující Sportity dokument.
- Při výpadku internetu se lokální data nezmění a chyba se zapíše do logu.
- API key není dostupný přes renderer ani logovaný v plaintextu.

## Otevřené otázky

- Jak přesně Sportity API pojmenovává channel/event/document?
- Umí API nahradit PDF soubor u existujícího dokumentu?
- Jsou názvy dokumentů v jedné složce unikátní?
- Jak API reprezentuje foldery?
- Jak se řeší `parent_id` při uploadu dokumentu?
- Je možné přes API vytvořit chybějící složky kategorií?
- Jaké jsou limity velikosti PDF a rate limity?
