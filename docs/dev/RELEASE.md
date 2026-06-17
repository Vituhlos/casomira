# Release proces

Verdict je offline Electron desktop aplikace. Release proces proto nestaví
Docker image ani `/api/health`; důležité jsou instalátory, dohledatelnost buildu
a diagnostika v aplikaci.

## Zdroj pravdy

- Verze aplikace: `package.json`
- Uživatelský changelog: `CHANGELOG.md`
- Release notes na GitHubu: generuje `scripts/release-notes.mjs` ze sekce changelogu
- Build metadata: generuje `scripts/generate-build-info.mjs` do `src/shared/buildInfo.generated.ts`

## Build metadata

Při `npm run build` a `npm run typecheck` se spustí `npm run build:metadata`.
Generovaný soubor obsahuje:

- verzi z `package.json`
- commit SHA a krátké SHA
- build date
- git ref
- release channel (`stable`, `beta`, `dev`)
- zda build vznikl lokálně nebo v GitHub Actions

Tyto údaje se zobrazují v Nastavení -> O aplikaci a jsou součástí kopírované
diagnostiky.

## Kontroly před vydáním

Lokálně:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Kontrola tagu:

```bash
npm run check:release -- v0.9.12-beta
```

Script ověří, že tag odpovídá `package.json.version` a že `CHANGELOG.md`
obsahuje sekci pro vydávanou verzi.

## Vydání

```bash
git tag v0.9.12-beta
git push origin v0.9.12-beta
```

Workflow `.github/workflows/release.yml`:

1. ověří tag/verzi/changelog,
2. sestaví release notes z `CHANGELOG.md`,
3. spustí `npm ci`, typecheck a testy,
4. sestaví Windows NSIS instalátor a macOS universal DMG,
5. nahraje assety do GitHub Release,
6. po úspěšných buildech Release publikuje.

## Changelog guardrail

Workflow `.github/workflows/changelog.yml` hlídá pull requesty do `master` a
`heroui-native`. Pokud PR mění produktový kód, závislosti, workflow nebo build
skripty, musí změnit `CHANGELOG.md`, nebo mít label `no-changelog-needed`.

## Diagnostika pro podporu

V aplikaci otevři Nastavení -> O aplikaci -> Kopírovat diagnostiku. Text obsahuje
verzi, commit, build date, runtime, platformu, DB schema verzi a cesty k databázi
i `startup.log`.
