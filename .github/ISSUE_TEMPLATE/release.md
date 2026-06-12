---
name: Release
about: Checklist pro vydání nové verze Časomíry
title: "Release vX.Y.Z"
labels: release
assignees: ""
---

## Bump

- [ ] Zvolen typ bumpu: PATCH / MINOR / MAJOR / prerelease
- [ ] `package.json` má verzi `X.Y.Z`
- [ ] `package-lock.json` je synchronizovaný
- [ ] `CHANGELOG.md` má sekci `## [X.Y.Z] - YYYY-MM-DD`
- [ ] Release notes jsou česky a srozumitelné pro časoměřiče

## Ověření

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Windows build: `npm run dist:win`
- [ ] macOS build / CI smoke test ověřený
- [ ] Hlavní workflow ručně vyzkoušené: závod, import, rošty, výsledky, PDF
- [ ] Záloha a obnova ověřená na testovacích datech
- [ ] Nastavení -> O aplikaci ukazuje správnou verzi a diagnostiku

## Vydání

- [ ] Commit s verzí, changelogem a změnami je na správné větvi
- [ ] Tag vytvořený ve tvaru `vX.Y.Z` nebo `vX.Y.Z-beta`
- [ ] Tag pushnutý na GitHub
- [ ] GitHub Release vznikl jako draft a po buildech se publikoval
- [ ] Release obsahuje Windows `Casomira-Setup-*.exe`
- [ ] Release obsahuje macOS `Casomira-*-mac-universal.dmg`
- [ ] Popis Release odpovídá sekci v `CHANGELOG.md`
- [ ] První spuštění na macOS ověřené přes Gatekeeper postup

## Poznámky

- Odkaz na Release:
- Odkaz na CI run:
