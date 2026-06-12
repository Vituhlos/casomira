# Profesionální release balíček

Tento dokument popisuje standard, který jsme zavedli pro profesionální verzování, changelog, release workflow, Docker image a diagnostiku aplikace. Dá se použít jako šablona pro další interní aplikace.

## Cíl

Z aplikace udělat produkt, který má:

- jasné verzování,
- srozumitelný changelog,
- release notes pro uživatele,
- automatické GitHub release,
- Docker image s profesionálními tagy,
- diagnostiku běžící verze,
- healthcheck pro monitoring,
- bezpečnější aktualizace a rollback.

## SemVer verzování

Používáme Semantic Versioning ve formátu:

```text
MAJOR.MINOR.PATCH
```

Příklad:

```text
1.1.1
```

Pravidla:

- `PATCH` znamená opravu chyby nebo malou provozní změnu.
- `MINOR` znamená novou funkci bez rozbití kompatibility.
- `MAJOR` znamená změnu, která může vyžadovat migraci, zásah do nasazení nebo změnu používání.

## CHANGELOG.md

Projekt má ručně vedený `CHANGELOG.md` ve stylu Keep a Changelog.

Ukázka:

```md
# Changelog

Všechny významné změny tohoto projektu budou dokumentované v tomto souboru.

Formát vychází z Keep a Changelog a projekt používá Semantic Versioning.

## [Unreleased]

Zatím žádné nevydané změny.

## [1.1.1] - 2026-06-12

### Changed

- Unraid template nově používá Docker tag `stable`.
```

Pravidlo:

Každá produktová změna musí mít záznam v `CHANGELOG.md` nebo v aplikačních release notes.

## Release notes v aplikaci

Vedle technického changelogu má aplikace i uživatelské release notes v UI.

Typicky:

```text
Nastavení -> O aplikaci -> Novinky
```

Tyto poznámky mají být kratší, méně technické a srozumitelné běžnému uživateli.

## Pravidla pro AI a vývojáře

Do repozitáře patří procesní pravidla, například v `AGENTS.md`.

Mají říkat:

- kdy upravit changelog,
- jak zvolit bump verze,
- že release popisy mají být česky,
- že se používá SemVer,
- že Docker produkce nemá stát pouze na `latest`,
- že produktové změny musí být dohledatelné v release notes.

## Endpoint /api/version

Aplikace má poskytovat endpoint, který vrací přesnou běžící verzi.

Příklad:

```json
{
  "name": "Kantýna",
  "version": "1.1.1",
  "commitSha": "193cd0678c826429f87a73e9c3c08f7876d365ac",
  "shortCommitSha": "193cd06",
  "buildDate": "2026-06-12T10:37:11Z",
  "releaseChannel": "stable",
  "gitRef": "v1.1.1",
  "dockerTag": "1.1.1",
  "nodeEnv": "production"
}
```

Smysl:

- podpora hned ví, co reálně běží,
- dá se ověřit správná aktualizace,
- dá se dohledat commit,
- dá se jednoduše potvrdit Docker tag a release kanál.

## Endpoint /api/health

Aplikace má poskytovat health endpoint pro monitoring.

Příklad:

```json
{
  "ok": true,
  "database": "ok",
  "scheduler": "ok",
  "version": "1.1.1"
}
```

Použití:

- Docker healthcheck,
- Unraid kontrola,
- reverse proxy monitoring,
- rychlé ověření, že aplikace žije a umí sáhnout na databázi.

## Panel O aplikaci

V nastavení aplikace má být panel `O aplikaci`.

Měl by zobrazovat:

- verzi aplikace,
- release kanál,
- build datum,
- commit,
- git ref,
- Docker tag,
- odkaz nebo tlačítko na novinky,
- tlačítko pro kopírování diagnostiky.

Diagnostika pro podporu má obsahovat:

- název aplikace,
- verzi,
- commit,
- build date,
- Docker tag,
- URL aplikace,
- aktuální čas klienta,
- timezone,
- user agent prohlížeče.

## Docker HEALTHCHECK

Docker image má obsahovat healthcheck napojený na `/api/health`.

Příklad:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

Smysl:

Docker nebo Unraid nevidí jen to, že běží proces, ale že aplikace opravdu odpovídá.

## Docker tagovací strategie

Stabilní release z tagu `v1.2.3` publikuje:

```text
ghcr.io/owner/app:1.2.3
ghcr.io/owner/app:1.2
ghcr.io/owner/app:1
ghcr.io/owner/app:stable
ghcr.io/owner/app:latest
ghcr.io/owner/app:sha-abcdef0
```

Doporučení:

- `stable` používat pro běžný Unraid nebo pohodlné produkční nasazení.
- Přesnou verzi, například `1.2.3`, používat pro rollback, audit a podporu.
- `latest` používat jen pro rychlé testování nebo technické účely.
- `sha-abcdef0` používat pro přesnou dohledatelnost buildu.

## GitHub workflow pro Docker

Při pushnutí tagu:

```text
v1.2.3
```

se automaticky:

- sestaví Docker image,
- pushne image na GHCR,
- doplní build metadata,
- vytvoří SemVer tagy,
- vytvoří `stable`,
- vytvoří `sha-<short-sha>`.

Build metadata se do aplikace předávají typicky přes build args:

```text
APP_VERSION
COMMIT_SHA
BUILD_DATE
RELEASE_CHANNEL
GIT_REF
DOCKER_TAG
```

## GitHub Release workflow

Při pushnutí tagu `vX.Y.Z` se automaticky vytvoří GitHub Release.

Release notes se extrahují z odpovídající sekce v `CHANGELOG.md`.

Například:

```bash
node tools/extract-release-notes.mjs v1.2.3
```

## Kontrola changelogu v CI

CI má hlídat, že produktová změna není bez changelogu.

Pravidlo:

Pokud PR mění produktový kód, Docker, workflow, databázi nebo závislosti, musí být upravený:

- `CHANGELOG.md`,
- nebo aplikační release notes.

Tahle kontrola nemusí být dogmatická pro každou drobnost, ale má fungovat jako guardrail.

## Release checklist

Repozitář má mít GitHub issue template pro release.

Checklist:

- zvolit bump verze,
- upravit `package.json` a lockfile,
- upravit `CHANGELOG.md`,
- upravit release notes v aplikaci,
- spustit lint,
- spustit build,
- spustit smoke test,
- vytvořit commit,
- vytvořit anotovaný tag `vX.Y.Z`,
- pushnout commit a tag,
- ověřit GitHub Release,
- ověřit Docker image tagy,
- ověřit `/api/version`,
- ověřit `/api/health`,
- ověřit zálohu a obnovu,
- ověřit hlavní uživatelské workflow.

## README update policy

README má obsahovat jasnou sekci pro aktualizaci a rollback.

Má vysvětlovat:

- jaký Docker tag používat,
- jak udělat zálohu,
- jak aktualizovat,
- jak rollbacknout,
- jak ověřit běžící verzi,
- jak ověřit healthcheck.

Pro Unraid je praktické doporučení:

```text
ghcr.io/owner/app:stable
```

Rollback pak znamená dočasně přepnout na přesnou starší verzi:

```text
ghcr.io/owner/app:1.2.2
```

## Doporučený postup pro další aplikaci

1. Přidat `CHANGELOG.md`.
2. Přidat procesní pravidla do `AGENTS.md`.
3. Přidat `/api/version`.
4. Přidat `/api/health`.
5. Zobrazit verzi v UI.
6. Přidat tlačítko `Kopírovat diagnostiku`.
7. Přidat Docker `HEALTHCHECK`.
8. Upravit Docker workflow na SemVer tagy.
9. Přidat Docker tag `stable`.
10. Přidat GitHub Release workflow z changelogu.
11. Přidat changelog kontrolu v CI.
12. Přidat release checklist.
13. Popsat update a rollback v README.
14. Udělat první čistý release.

## Minimální sada souborů

Pro podobnou implementaci v další aplikaci se typicky přidávají nebo upravují:

```text
CHANGELOG.md
AGENTS.md
README.md
Dockerfile
package.json
package-lock.json
.github/workflows/docker.yml
.github/workflows/release.yml
.github/workflows/changelog.yml
.github/ISSUE_TEMPLATE/release.md
tools/extract-release-notes.mjs
tools/check-changelog.mjs
lib/version.ts
lib/release-notes.ts
app/api/version/route.ts
app/api/health/route.ts
```

Názvy souborů se můžou lišit podle frameworku, ale princip zůstává stejný.

