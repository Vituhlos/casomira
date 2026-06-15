# Časomíra — logo assety v5 (asymetrická stopa, zpřísněné vršky)

Alternativa k vyvážené variantě (v4): nájezdové rameno je širší a plošší,
výjezdové strmější — stopa vracečkou místo symetrického háčku. Horní rádiusy
ramen jsou menší (štíhlejší kapsle), zužování pomalejší.

## Specifikace
- Ramena (light verze): #18181b · Ramena (dark verze): #FFFFFF
- Apex bod: #006FEE — nikdy nepřebarvovat, vždy sedí v mezeře mezi rameny
- Písmo nápisu: Figtree SemiBold 600, letter-spacing −1,5 % — v SVG převedeno na křivky (licence SIL OFL, viz Figtree-OFL.txt)
- Zarovnání lockupu: vrch vyššího ramene = cap-height, spodek bodu = účaří; mezera ikona–text 0,28× velikosti textu

## Soubory
| Soubor | Použití |
|---|---|
| casomira-mark-{light,dark}.svg | samotná značka, vektor, průhledné pozadí |
| casomira-lockup-{light,dark}.svg | plný logotyp, vektor, text na křivkách |
| casomira-icon-512-{light,dark}.png | zdroj pro ikonu appky / favicon, průhledné pozadí |
| casomira-lockup-{light,dark}-800x200.png | GitHub README |
| casomira-banner-1280x640.png | GitHub social preview / OG image, pozadí #18181b |

## Ikony aplikace (složka icons/)
| Soubor | Použití |
|---|---|
| casomira.ico | Windows — multi-rozlišení 16/24/32/48/64/128/256 px, full-bleed dlaždice #18181b, rádius 18 % |
| casomira.icns | macOS — squircle podle HIG (obsah 824/1024, rádius 185, jemný stín), velikosti 16–1024 vč. @2x |
| casomira-windows-256.png / casomira-macos-1024.png | zdrojové PNG obou kompozic |

`assets/brand/` je zdroj pravdy pro logo a ikonové exporty. Produkční kopie pro
electron-builder jsou v `build/`:

- `build/icon.ico` = kopie `assets/brand/icons/casomira.ico`
- `build/icon.icns` = kopie `assets/brand/icons/casomira.icns`
- `build/icon.png` = runtime PNG z `assets/brand/icons/casomira-windows-256.png`
