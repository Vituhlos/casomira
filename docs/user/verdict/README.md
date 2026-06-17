# Verdict — Brand Kit

Produkční identita pro **Verdict** — desktopovou aplikaci pro měření času v motorsportu a rallycrossu.

Logo-systém stojí na schváleném symbolu **P1** (dvě časoměrné čepele + modrý pivot s náznakem apexu) a logotypu na **Figtree**, převedeném na **křivky** (nezávislé na fontu). Symbol P1 je napříč platformami neměnný.

## Dva oficiální prvky

**1) Hlavní logo — Směr 03** (`logo/verdict-mainlogo-*`)
Iniciála „V" je tvořena přímo čepelemi symbolu P1 + modrým pivotem; zbytek „erdict" v křivkách.
→ app/avatar značka, splash, hero, GitHub header, marketing, social. Funguje **samostatně** bez odděleného symbolu.

**2) Wordmark — Směr 01** (`logo/verdict-wordmark-*`)
Klidný logotyp „Verdict"; tečka nad „i" nahrazena plným modrým pivotem.
→ UI, dokumenty, malé velikosti, jednobarevný tisk. Do lockupů se páruje se symbolem P1.

## Paleta
| | HEX | Použití |
|---|---|---|
| Race Blue | `#2563FF` | pivot (vždy plná barva), akcenty, primární akce |
| Ink | `#0B0D12` | tmavá pozadí, písmena na světlém, text |
| Snow | `#FFFFFF` | světlá pozadí, písmena na tmavém |

Logotyp: **Figtree SemiBold (600)**, tracking **−1,2 %**, nativní kerning, baseline-lock. V master SVG převeden na **křivky**. Žádné gradienty ani efekty.

## Struktura
```
verdict/
├── logo/                  hlavní logo 03 · wordmark 01 · symbol P1 · lockupy
│   ├── verdict-mainlogo-{light,dark}.svg        (Směr 03 — křivky)
│   ├── verdict-wordmark-{light,dark}.svg        (Směr 01 — křivky)
│   ├── verdict-symbol-{light,dark}.svg          (P1 — beze změny)
│   ├── verdict-lockup-horizontal-{light,dark}.svg
│   ├── verdict-lockup-vertical-{light,dark}.svg
│   └── png/               PNG sady všech výše + on-dark/on-white bannery
├── app-icons/             macOS + Windows (symbol P1 — beze změny)
├── favicon/               favicon.ico · apple-touch · android-chrome (symbol P1)
├── github/                readme-hero (1280×640) · social-preview (1280×640) · repo-header (1280×320)
├── marketing/             og-banner (1200×630) · reddit-banner (1920×384) · discord-preview (1200×630)
├── app-screens/           splash (1280×800) · loading (1280×800) · about (760×600)
├── fonts/                 Figtree (SIL OFL)
├── verdict-brand.js       master modul (zmrazená geometrie + křivky + lockupy)
└── verdict-brand-guide.html → otevřít a vytisknout do PDF (A4)
```

## Pravidla použití
- **Pivot vždy plná `#2563FF`** — nikdy se nepřebarvuje, nedává do gradientu.
- Písmena a čepele monochromní: bílé na tmavém, inkoustové (`#0B0D12`) na světlém.
- Hlavní logo 03 je primární značka — používej ho pro avatar, splash a hero.
- Wordmark 01 pro klidná, malá a jednobarevná použití; min. výška **18 px**.
- Lockupy: vertikální (symbol P1 nad wordmarkem) a horizontální (symbol P1 + wordmark).
- Ochranná zóna = průměr modrého pivotu na všech stranách.
- **Symbol P1, app ikony a favicony jsou neměnné** (jsou jen symbol, bez textu).

## Symbol / ikony — beze změny
Symbol P1, app-icons (macOS/Windows, light/dark) a favicony zůstávají identické s předchozím kitem — neobsahují text, takže finalizace logotypu se jich netýká.

© 2026 Verdict · Symbol P1 · Logotyp Figtree převedený na křivky (SIL OFL)
