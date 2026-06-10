# HeroUI migrace — Days 9–12 + otázka full redesignu

> Navazuje na `plan-heroui-components.md` (Days 1–8, vše hotovo).  
> Větev: `experiment/heroui`

---

## Stav po Day 8

```
Design systém         ████████████████████ 100%  tokeny, dark mode, mac.css
Navigace / layout     ████████████████████ 100%  Sidebar, Toolbar, Segmented, SubTabs
Overlaye              ████████████████████ 100%  Modal, Dropdown
Primitivní UI         ████████░░░░░░░░░░░░  40%  Btn custom, table custom, Tooltip custom
Formuláře             ████████░░░░░░░░░░░░  30%  raw inputs, select, checkbox
Notifikace / feedback ████░░░░░░░░░░░░░░░░  20%  Toast ruční, Alert hardcoded
```

---

## Day 9 — Toast + Separator

**Rozsah:** ~2 hod · nulové riziko

### Toast

Největší architektonická změna zbývajícího plánu.

**Problém teď:**
- 58 výskytů `onToast`/`setToast`/`toast` ve 6 souborech
- Každá komponenta spravuje vlastní toast state:
  ```tsx
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])
  ```
- `onToast` je prop drilovaný: `App → Settings → TiskovyPresetModal / SportityModal`

**Po migraci:**
```tsx
// App.tsx — jednou:
<Toast.Provider />

// Kdekoliv v aplikaci bez props:
import { toast } from '@heroui/react'
toast("PDF uloženo.")
toast.success("Hotovo — 12 PDF uloženo")
toast.danger("Export se nezdařil")
toast.warning("Složka neexistuje!")
```

**Co se odstraní:**
- `onToast` prop z: `Settings`, `TiskovyPresetModal`, `SportityModal`, `RestoreBackupModal`
- `[toast, setToast]` state ze všech 6 souborů
- Manuální toast rendering ze `StopkyApp`

**Postup:**
1. Přidat `<Toast.Provider />` do `App.tsx` (root render)
2. Procházet soubory od listů stromu výš (TiskovyPresetModal → Settings → App)
3. Nahradit `onToast(msg)` voláním `toast(msg)` / `toast.success()` / `toast.danger()`
4. Odebrat `onToast` prop kaskádovitě nahoru

---

### Separator

10 výskytů hairline `<div>` ve 3 souborech (Settings, SportityModal, RaceDialog):
```tsx
// Teď:
<div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />

// Po:
<Separator className="my-[18px]" />
```
Semantický `<hr>` s `role="separator"`. Import: `import { Separator } from '@heroui/react'`.

---

## Day 10 — Alert

**Rozsah:** ~1.5 hod · 10 souborů

20 výskytů hardcoded `#c93636` ve 10 souborech. Dvě kategorie:

### A) Chybové zprávy v dialozích

Soubory: PenalizaceDialog, RaceDialog, ImportDialog, StopkyApp, RostGrid, UpravaLogModal

```tsx
// Teď:
{chyba && (
  <p style={{ margin: '8px 0 0', fontSize: 12.5, color: '#c93636' }} role="alert">
    {chyba}
  </p>
)}

// Po:
{chyba && (
  <Alert status="danger" className="mt-2">
    <Alert.Indicator />
    <Alert.Content><Alert.Title>{chyba}</Alert.Title></Alert.Content>
  </Alert>
)}
```

### B) Informační panely (status-colored backgrounds)

- **RaceDialog** — RX Cup varování (žlutý rámeček `rgba(255,159,10,0.08)`) → `<Alert status="warning">`
- **SportityModal** — test result `✓/✗` jako inline text → `<Alert status="success/danger">`
- **Results/table** — stavová varování podobného charakteru

**Co se vyřeší:**
- Hardcoded `#c93636` → `--danger` token (dark mode správně)
- Ikona zdarma přes `<Alert.Indicator />`
- `role="alert"` built-in

---

## Day 11 — ToggleButtonGroup + Checkbox

**Rozsah:** ~2 hod

### ToggleButtonGroup

Dva inline "pill toggle" přepínače jsou identické s pre-Day8 SubTabs kódem:

**RaceDialog.tsx** — přepínač "RAC Race / RX Cup":
```tsx
// Teď: ruční <button> s var(--seg-track) background

// Po — reuse existujících .subtabs CSS overrides:
<ToggleButtonGroup
  selectionMode="single"
  selectedKeys={new Set([typ])}
  onSelectionChange={(keys) => zmenTyp([...keys][0] as RaceType)}
  className="subtabs"
>
  <ToggleButton id="RAC">RAC Race</ToggleButton>
  <ToggleButton id="RX">
    <ToggleButtonGroup.Separator />
    RX Cup <DevBadge />
  </ToggleButton>
</ToggleButtonGroup>
```

**ImportDialog.tsx** — přepínač "Přeskočit / Přepsat":
```tsx
<ToggleButtonGroup
  selectionMode="single"
  selectedKeys={new Set([policy])}
  onSelectionChange={(keys) => setPolicy([...keys][0] as ImportPolicy)}
  className="subtabs"
>
  <ToggleButton id="skip">Přeskočit</ToggleButton>
  <ToggleButton id="overwrite">
    <ToggleButtonGroup.Separator />
    Přepsat
  </ToggleButton>
</ToggleButtonGroup>
```

Díky `.subtabs` CSS (Day 8) žádné nové styly nepotřebujeme.

### Checkbox

Settings.tsx (výběr kategorií pro hromadný export) + ImportDialog.tsx:
```tsx
// Teď (browser-native, Windows vypadají špatně):
<input
  type="checkbox"
  checked={vybrane.has(k.id)}
  onChange={() => prepni(k.id)}
  style={{ accentColor: 'var(--accent)', width: 15, height: 15 }}
/>

// Po:
<Checkbox
  isSelected={vybrane.has(k.id)}
  onChange={() => prepni(k.id)}
  isDisabled={!matched}
>
  <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
  <Checkbox.Content>
    <Label>{k.nazev}</Label>
  </Checkbox.Content>
</Checkbox>
```

Compound pattern je verbose, ale vizuálně konzistentní na Windows i macOS.

---

## Day 12 — Formuláře: Select + TextField

**Rozsah:** ~3 hod · největší soubor změn

### Select (jednodušší část)

PenalizaceDialog.tsx má dva `<select>` elementy (druh zásahu + cílové pořadí). Browser-native `<select>` nevypadá dobře na Windows.

```tsx
// Teď:
<select value={druh} onChange={(e) => setDruh(e.target.value as DruhPenalizace)} style={inputStyle}>
  <option value="CASOVA">Časová (+ sekundy k času)</option>
  <option value="BODOVA">Bodová (úprava bodů v jízdě)</option>
  <option value="POSUN">Posun pořadí</option>
</select>

// Po:
<Select selectedKey={druh} onSelectionChange={(k) => setDruh(k as DruhPenalizace)}>
  <Select.Trigger><Select.Value /></Select.Trigger>
  <Select.Popover>
    <Select.ListBox>
      <Select.Option id="CASOVA">Časová (+ sekundy k času)</Select.Option>
      <Select.Option id="BODOVA">Bodová (úprava bodů v jízdě)</Select.Option>
      <Select.Option id="POSUN">Posun pořadí</Select.Option>
    </Select.ListBox>
  </Select.Popover>
</Select>
```

### TextField / Input (větší část)

~25 `<input>` elementů v 5 souborech s ručním `inputStyle`:
```tsx
const inputStyle: React.CSSProperties = {
  width: '100%', height: 32, padding: '0 10px',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius)',
  background: 'var(--surface)', color: 'var(--foreground)',
  font: 'inherit', fontSize: 13, outline: 'none'
}
```

**Problém teď:**  
Label je `<span>` nebo `<div>` bez `htmlFor` + `<input>` bez `id` — label není přístupnostně provázaný.

**Po migraci (prioritní soubory):**
```tsx
// RaceDialog, PenalizaceDialog — plné TextField:
<TextField>
  <TextField.Label>Název závodu</TextField.Label>
  <TextField.Input placeholder="např. MČR Autocross — Přerov" autoFocus />
</TextField>

// Se stavem a validací:
<TextField isInvalid={!!chyba} value={nazev} onChange={setNazev}>
  <TextField.Label>Penalizace (sekundy)</TextField.Label>
  <TextField.Input inputMode="decimal" placeholder="např. 10" />
  {chyba && <TextField.ErrorMessage>{chyba}</TextField.ErrorMessage>}
</TextField>
```

**Strategie:** Začni s formuláři v dialozích (RaceDialog, PenalizaceDialog). Sportity vstupy (heslo kanálu, API klíč) jsou méně prioritní — dají se nechát na later.

---

## Volitelné *(po Day 12, nízká priorita)*

| Komponenta | Kde | Odhadovaný čas |
|---|---|---|
| **Spinner** | Btn loading states, SportityModal | 1 hod |
| **AlertDialog** | RaceDialog confirm ("Odebrat kategorie?") | 30 min |
| **Breadcrumbs** | Toolbar breadcrumb | 30 min |
| **ListBox** | PickerList v RaceDialog + SportityModal | 1.5 hod |
| **NumberField** | PenalizaceDialog sekundy + pozice | 30 min |
| **TextArea** | PenalizaceDialog důvod | 15 min |

---

## Otázka: přepsat design od nuly?

### Co "redesign od nuly" reálně znamená

Přepsal bys UI vrstvu. **Business logika (pravidla, SQLite, PDF, Sportity, stopky)** — ~60 % codebase — se **nezmění**. Tu přepisovat nepotřebuješ.

### Tři věci, které "od nuly" nevyřeší snáze než postupně

**1. `Btn` → HeroUI Button**  
Pořád potřebuješ:
- Přidat `--default`, `--default-hover`, `--accent-hover` tokeny do `app.css`
- Změnit 40+ callsitů: `onClick` → `onPress`, `disabled` → `isDisabled`, odstranit `icon` prop
- Rozhodnout: HeroUI Button `md` = 36px výška vs náš 28px toolbar — změnit `--toolbar-h`?

"Od nuly" nebo "postupně" — **stejná práce, stejná rozhodnutí**.

**2. `table.tsx` → HeroUI Table**  
HeroUI Table = React Aria Collection, kompletně jiná API (`Column`, `Row`, `Cell`, `TableBody`).  
Vyžaduje přepis všech 10+ screenových komponent (StartList, Results, QVysledky, RostGrid…) **najednou**.  
Toto je největší riziko v celé appce. Postupná migrace (spike na StartList → pak ostatní) je bezpečnější než big-bang rewrite.

**3. HeroUI v3 je stále beta**  
Table, pokročilé formuláře, Toolbar se aktivně mění (viz releases v3-0-0-beta-* až v3-1-0).  
Vsadit "vše najednou" na beta komponentu je větší risk než průběžná migrace, kde každý krok buildí.

### Doporučená cesta

1. **Dokonči Days 9–12** (~8 hodin práce, formuláře + feedback na 80 %)
2. **Spike na HeroUI Table** — implementuj *jednu* tabulku (StartList — nejjednodušší).  
   Uvidíš: jak moc HeroUI Table sedí do domény, jak se napojuje EditableCell, jak vypadají zebra řádky.  
   Pokud to bude dobré → pokračuj tabulkami. Pokud ne → necháš custom a máš 90 % HeroUI jinak.
3. **Btn → HeroUI Button** — po rozhodnutí o výšce a tokenech, jde postupně.

**Full redesign by zabral 3–6 týdnů a přinesl by primárně HeroUI Table + HeroUI Button.**  
Incremental cesta (Days 9–12 + spike) přinese totéž za ~10 hodin s nulovým rizikem pro fungující appku.

---

## Přehled zbývajících komponent

| Komponenta | Den | Soubory | Priorita |
|---|---|---|---|
| Toast | 9 | App, Settings, TiskovyPreset, SportityModal, RestoreBackup, StopkyApp | 🔴 |
| Separator | 9 | Settings, SportityModal, RaceDialog | 🟡 |
| Alert | 10 | PenalizaceDialog, RaceDialog, ImportDialog + 7 dalších | 🟠 |
| ToggleButtonGroup | 11 | RaceDialog, ImportDialog | 🟠 |
| Checkbox | 11 | Settings, ImportDialog | 🟡 |
| Select | 12 | PenalizaceDialog | 🟢 |
| TextField | 12 | RaceDialog, PenalizaceDialog, SportityModal, Settings | 🟢 |
| Spinner | vol. | StopkyApp, Settings, SportityModal | 🟡 |
| AlertDialog | vol. | RaceDialog | ⚪ |
| Breadcrumbs | vol. | Toolbar | ⚪ |
| ListBox | vol. | RaceDialog, SportityModal | ⚪ |
| **Btn → HeroUI Button** | future | ~40+ callsitů | 🔴 blokuje tokeny |
| **table.tsx → HeroUI Table** | future | 10+ screen komponent | 🔴 spike first |
