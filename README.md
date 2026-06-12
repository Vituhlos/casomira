# Časomíra

Desktopová aplikace pro **časoměřičství autokrosu a rallycrossu** — náhrada sady Excelových sešitů jedním offline programem pro Windows a macOS.

Jeden operátor, jeden počítač, žádná síť. Data v lokální SQLite. Pravidla RAC Race (Hobby), RX Cup a Šotolina podle časoměřičské bible, v MVP co nejvěrněji stávajícímu workflow.

<p align="center">
  <img src="reference/Casomira-macOS/screenshots/04-vysledky-q1.png" alt="Výsledky Q1 — světlý režim" width="720">
</p>

---

## Dokumentace pro testery

| Formát | Instalace Mac | Návod k použití |
|--------|---------------|-----------------|
| **Word (.docx)** — k poslání testerům | [docs/user/Casomira-instalace-Mac.docx](./docs/user/Casomira-instalace-Mac.docx) | [docs/user/Casomira-navod-pro-testery.docx](./docs/user/Casomira-navod-pro-testery.docx) |
| Markdown (zdroj v repu) | [docs/user/INSTALACE-MAC.md](./docs/user/INSTALACE-MAC.md) | [docs/user/NAVOD-PRO-TESTERY.md](./docs/user/NAVOD-PRO-TESTERY.md) |

Přegenerovat Word z Markdownu: `npm run docs:word`

## Stáhnout

Instalátory najdeš u **[GitHub Releases](https://github.com/Vituhlos/casomira/releases)** (po vydání tagu, např. `v0.9.1`):

| Platforma | Soubor |
|-----------|--------|
| Windows | `Casomira-Setup-x.y.z.exe` — NSIS instalátor (Start menu, odinstalace) |
| macOS | `Casomira-x.y.z-mac-universal.dmg` (Intel + Apple Silicon) |

Bez release tagu můžeš sestavit lokálně — viz [docs/dev/BUILD.md](./docs/dev/BUILD.md).

---

## Co umí (MVP)

- **Závod** RAC / RX při založení; **kategorie** se samostatnými pravidly (`STANDARD` / `Šotolina`)
- Startovní listina, import z `.xls` / `.xlsx`
- Rošty s autofill podle startovního čísla
- Výsledky: vložení časů ze schránky (Free Stopwatch), automatické pořadí a body, stavy DNF / DNS / DQ
- Klasifikace po Q2 / Q3 včetně tiebreaku dle formátu
- Semifinále, finále, finále A/B (Šotolina), celkové výsledky
- **PDF** — WYSIWYG export obrazovky (jako dnešní VBA v Excelu)
- **Penalizace ředitele** — časová, bodová, posun pořadí + auditní log zásahů
- Vestavěné **stopky** (mezerník / Backspace), světlý a tmavý režim

Plánované rozšíření (fáze 2): auto-seedování roštů, auto SF/finále, záloha závodu, další validace — viz [CLAUDE.md](./CLAUDE.md).

---

## Požadavky

- **Node.js** 22 LTS (vývoj i sestavení instalátoru)
- **Windows 10+** nebo **macOS** (běh aplikace)
- Instalátor pro Mac se balí na Macu nebo v GitHub Actions

---

## Vývoj

```bash
git clone https://github.com/Vituhlos/casomira.git
cd casomira
npm install
npm run dev
```

| Příkaz | Popis |
|--------|--------|
| `npm run dev` | Vývojový režim (Electron + Vite) |
| `npm run build` | Kompilace do `out/` |
| `npm run typecheck` | TypeScript kontrola |
| `npm run dist:win` | Windows instalátor → `release/` |
| `npm run dist:mac` | macOS DMG → `release/` |

Podrobný návod k balení a řešení EPERM při buildu: **[docs/dev/BUILD.md](./docs/dev/BUILD.md)**.

---

## Vydání na GitHubu (Actions)

Tag `v*` spustí workflow, který **paralelně** sestaví Windows instalátor i macOS DMG a nahraje je do Releases:

```bash
# verze v package.json = 0.9.12-beta
npm run check:release -- v0.9.12-beta
git tag v0.9.12-beta
git push origin v0.9.12-beta
```

Release workflow před balením ověří verzi, changelog, TypeScript i testy. Build metadata
(commit, datum buildu, release kanál) jsou vidět v aplikaci v **Nastavení → O aplikaci**
a dají se zkopírovat jako diagnostika.

Podrobnosti: **[docs/dev/RELEASE.md](./docs/dev/RELEASE.md)** · build: **[docs/dev/BUILD.md](./docs/dev/BUILD.md)** · workflow: [`.github/workflows/release.yml`](./.github/workflows/release.yml)

---

## Technologie

Electron · React · Vite · TypeScript · `node:sqlite` · HeroUI v3 · Tailwind CSS v4 · SheetJS (`xlsx`) · electron-builder (NSIS / DMG)

Klikací prototyp ve složce [`reference/Casomira-macOS/`](./reference/Casomira-macOS/) slouží už jen jako UX reference. Produkční UI běží na HeroUI v3 a produkční logika bodování a klasifikace je v `src/main/`.

---

## Struktura repozitáře

```
src/                         # Produkční aplikace
reference/Casomira-macOS/    # Klikací prototyp (reference vzhledu)
docs/user/                   # Návody a Word pro testery
docs/dev/                    # Build, technické plány
docs/prompts/                # Historické zadání pro AI
fixtures/                    # Ukázkové soubory pro test importu
build/                       # Ikony pro instalátor
```

Přehled složek: [docs/README.md](./docs/README.md).

---

## Licence

Soukromý projekt — **všechna práva vyhrazena** (`UNLICENSED` v `package.json`). Není určeno jako open source, dokud autor výslovně neurčí jinak.

---

## Kontakt / autor

Repozitář: [@Vituhlos/casomira](https://github.com/Vituhlos/casomira)
