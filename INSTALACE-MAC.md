# Časomíra — instalace na Macu (testovací verze)

Návod pro časoměřiče bez technických znalostí. Platí pro **macOS 11 (Big Sur) a novější**, Mac s procesorem **Intel** i **Apple Silicon (M1/M2/M3…)**.

---

## 1. Stáhnout instalátor

Dostaneš odkaz na soubor:

**`Casomira-0.9.1-mac-universal.dmg`**

(nebo novější verzi se stejným názvem — číslo verze se může lišit)

- Klikni na odkaz a počkej, až se soubor stáhne (obvykle do složky **Stažené**).
- Velikost je řádově **150–250 MB** — na pomalém připojení to chvíli trvá.

---

## 2. Otevřít disk a přesunout aplikaci

1. V **Stažených** (nebo v prohlížeči) **dvakrát klikni** na soubor `.dmg`.
2. Otevře se okno s ikonou **Časomíra** a složkou **Applications** (Aplikace).
3. **Přetáhni** ikonu Časomíry do složky Applications (stejně jako u běžných programů).
4. Zavři okno disku a v postranním panelu Finderu **vysuň** disk Časomíra (ikona šipky „vysunout“), případně ho přetáhni do Koše — to jen odpojí instalační obraz, aplikaci to nesmaže.

Aplikace je nainstalovaná ve **Aplikace → Časomíra**.

---

## 3. První spuštění (důležité)

Aplikace zatím není podepsaná u Apple („vývojář není ověřený“). To u testovací verze je normální.

**Nepoužívej** jen dvojklik, pokud Mac ukáže, že aplikaci **nelze otevřít** nebo že je od **neidentifikovaného vývojáře**.

### Varianta A — doporučená

1. Otevři **Finder → Aplikace**.
2. Najdi **Časomíra**.
3. **Pravé tlačítko** (nebo Ctrl + klik) → **Otevřít**.
4. V dialogu znovu klikni **Otevřít**.

Stačí **jednou**. Další spuštění už půjde obyčejným dvojklikem.

### Varianta B — přes Nastavení

1. Zkus aplikaci spustit dvojklikem (musí to jednou „odmítnout“).
2. Otevři **Nastavení systému** → **Soukromí a zabezpečení** (na starším macOS **Zabezpečení a soukromí**).
3. Dole uvidíš text, že spuštění Časomíry bylo zablokováno → klikni **Přesto otevřít** / **Otevřít**.

---

## 4. Co čekat po spuštění

- Aplikace běží **offline** — nepotřebuje internet ani účet.
- Data závodu se ukládají **na tomto Macu** (do složky aplikace v uživatelských datech).
- Pro test můžeš založit závod, naimportovat startovku nebo zadat pár časů — stejně jako v Excelu, jen v jednom programu.

---

## 5. Aktualizace na novější verzi

1. Ukonči Časomíru (Cmd+Q).
2. Stáhni nový `.dmg` z odkazu, který dostaneš.
3. Přetáhni novou Časomíru do **Applications** a při dotazu zvol **Nahradit** stávající verzi.
4. Při prvním spuštění nové verze znovu může být potřeba **Otevřít** pravým tlačítkem (krok 3).

*(Záloha celého závodu zatím není v menu — u testu si případně zkopíruj důležitá data před přepsáním.)*

---

## Časté problémy

| Problém | Co zkusit |
|--------|-----------|
| „Poškozený“ nebo nejde otevřít DMG | Stáhni soubor znovu; nesmí projít přes e-mail, který `.dmg` poškodí — raději odkaz z cloudu. |
| Aplikace se hned zavře | Napiš provozovateli verzi macOS (  →  o Macu) a co přesně se stalo. |
| Chybí oprávnění | Pro test stačí běžný uživatelský účet; admin není nutný. |
| Starý Mac (před rokem 2020) | Použij soubor s názvem **mac-universal** — funguje i na Intelu. |

---

## Co dál po instalaci

Jak appku používat (závod, kategorie, rošty, časy, PDF, Stopky): soubor **Word** `docs/Casomira-navod-pro-testery.docx` (zdroj: [NAVOD-PRO-TESTERY.md](./NAVOD-PRO-TESTERY.md))

---

## Kontakt při testu

Při problému napiš:

- verzi macOS (např. Sonoma 14.5),
- Intel nebo Apple Silicon (  →  o Macu → čip),
- co přesně se na obrazovce objevilo (klidně fotka).
