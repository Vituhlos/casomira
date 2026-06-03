# Plán pro Claude Code — titulek okna stopek + zavírání s nezapsaným měřením

> **Účel:** Není to příkaz „udělej to“, ale kontext + checklist ověření. Nejdřív má sedět diagnóza s kódem, pak teprve úprava.

---

## Kontext (co už víme)

Uživatel zavře okno stopek (❌) při **nezapsaném rozměřeném čase** → modal „Zavřít i tak“. Po potvrzení **zmizí jen modal**, okno zůstane. Druhé ❌ okno zmizí **bez** modalu.

**Hypotéza (ověř v repu):**

1. Po načtení rendereru se titulek okna přepíše z `index.html` (`<title>Časomíra</title>`) — okno v liště už **neobsahuje „Stopky“**.
2. V `stopky:zavritPotvrzeno` se okno hledá přes `BrowserWindow.getAllWindows().find(w => w.getTitle().includes('Stopky'))` → **nenajde se** → `close()` se nevolá.
3. Před tím se nastaví `stopkyForceClose = true` v `src/main/stopkyClose.ts`; reset je jen v handleru `win.on('close')`. Když `close()` neproběhne, flag **zůstane true** → druhé zavření obejde guard a modal.

První zachycení zavření funguje přes `attachStopkyCloseGuard(stopkyWin)` (přímá reference `win`), problém je až v **druhé fázi** po IPC potvrzení.

---

## Co přesně zkontrolovat (před úpravou)

### A) Titulek okna stopek

- [ ] `src/main/windows.ts` — počáteční `title: 'Stopky — Časomíra'` u `BrowserWindow`.
- [ ] `src/renderer/index.html` — `<title>Časomíra</title>` (sdílené s hlavním oknem).
- [ ] `src/renderer/src/StopkyApp.tsx` — jestli někde nastavuje `document.title` (pravděpodobně ne).
- [ ] Po `loadURL` / `loadFile` v běžící appce (dev i build): jaký je **skutečný** `BrowserWindow.getTitle()` okna stopek — očekáváme jen „Časomíra“.

### B) Zavírání s nezapsaným měřením

- [ ] `src/main/stopkyClose.ts` — `attachStopkyCloseGuard`, `stopky:zavritPotvrzeno`, `stopkyForceClose`, `confirmPending`.
- [ ] `src/renderer/src/StopkyApp.tsx` — `showCloseConfirm`, `onStopkyRequestConfirm`, tlačítko „Zavřít i tak“ → `stopkyZavritPotvrzeno()`.
- [ ] `src/preload/index.ts` + `src/shared/types.ts` — IPC povrch.
- [ ] `repo.mereniMaNezapsane()` — kdy guard vůbec aktivuje varování.

### C) Stejný vzor jinde

- [ ] `before-quit` v `stopkyClose.ts` — také hledá okno přes `getTitle().includes('Stopky')`?
- [ ] `stopkyClose.ts` — `requestStopkyClose()` — je použitý, nebo mrtvý kód?

### D) Ověření diagnózy

- [ ] Projít flow na papíře: ❌ → modal → „Zavřít i tak“ → má se zavolat `close()` na **správném** okně.
- [ ] Potvrdit, že při neúspěšném `find()` zůstane `stopkyForceClose === true` (vysvětluje druhé zavření bez modalu).

---

## Směr opravy (navrhni a ověř, že sedí s diagnózou)

### 1) Titulek — ano, jde to mít „Stopky“

Možnosti (vyber nejjednodušší konzistentní s projektem):

- V `StopkyApp` při mountu (a při změně závodu volitelně) nastavit `document.title`, např. `Stopky — ${nazevZavodu}` nebo jen `Stopky — Časomíra`.
- Nebo v main po `did-finish-load` u okna stopek volat `stopkyWin.setTitle(...)` a případně zabránit přepsání z HTML (Electron: `win.on('page-title-updated', (e) => e.preventDefault())` + vlastní titulek) — pokud chceš titulek **jen** z main.

**Cíl:** titulek v liště jasně říká Stopky; hlavní okno může zůstat „Časomíra“.

### 2) Zavírání — nehledat okno podle titulku

**Preferovaný směr:**

- V `ipcMain.handle('stopky:zavritPotvrzeno', (event) => ...)` použít `BrowserWindow.fromWebContents(event.sender)` (okno, ze kterého modal přišel).
- `stopkyForceClose = true` nastavit **jen** pro toto okno / těsně před `thatWin.close()`.
- Pokud `fromWebContents` vrátí `null`, logovat / fallback (ne tiše nechat flag zapnutý).

**Alternativa:** držet referenci `stopkyWin` v `windows.ts` a exportovat getter — horší než `event.sender`, ale OK pokud IPC vždy jde ze stopek.

### 3) `stopkyForceClose` — nesmí zůstat viset

- Nastavovat `true` až když je jisté, že hned voláš `close()` na nalezeném okně.
- Nebo při neúspěchu `close()` flag **vrátit na `false`**.
- Ověřit, že druhé ❌ po „Zavřít i tak“ **nepřeskočí** modal, pokud měření pořád není zapsané (regrese).

### 4) `before-quit`

- Stejná oprava hledání okna (ne `includes('Stopky')` na přepsaném titulku), pokud tam je stejná chyba.

---

## Co neměnit (scope)

- Logiku `mereniMaNezapsane`, autosave stopek, zápis do výsledků — jen pokud je to nutné pro zavírání.
- Pravidla závodu, bodování, UI mimo stopky.

---

## Test plan po úpravě (manuální)

1. Otevřít stopky, naměřit pár kliků **bez** „Zapsat do výsledků“.
2. Ověřit titulek okna (obsahuje „Stopky“).
3. ❌ → modal → **Zavřít i tak** → okno stopek **zmizí** (ne jen modal).
4. Znovu otevřít stopky, stejný stav → ❌ → **Zůstat** → okno zůstane, modal pryč.
5. Znovu ❌ → **Zavřít i tak** → zase celé okno pryč.
6. (Volitelně) Ukončit celou appku s nezapsaným měřením — stejné chování modal + zavření/quit.

---

## Výstup od Claude Code (co chci zpět)

1. **Potvrzení / vyvrácení** diagnózy (1–2 odstavce, konkrétní soubory/řádky).
2. **Zvolený návrh** titulku + zavírání (proč).
3. **Minimální diff** — které soubory, bez refaktoringu navíc.
4. Provedení úpravy + `npm run typecheck`.

---

## Reference v repu (startovní body)

| Soubor | Téma |
|--------|------|
| `src/main/stopkyClose.ts` | guard, `stopkyForceClose`, IPC potvrzení |
| `src/main/windows.ts` | vytvoření okna stopek, `attachStopkyCloseGuard` |
| `src/renderer/src/StopkyApp.tsx` | modal `showCloseConfirm` |
| `src/renderer/index.html` | přepsání titulku na „Časomíra“ |

---

## Poznámka pro review

Když navrhneš něco jiného než `BrowserWindow.fromWebContents(event.sender)`, **odůvodni**, proč to nebude mít stejný problém s titulkem a visícím `stopkyForceClose`.
