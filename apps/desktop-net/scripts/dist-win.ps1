<#
.SYNOPSIS
    Sestaví Windows instalátor Verdict (.NET/Avalonia).
    Spusť na Windows PC ve složce apps/desktop-net/.

.EXAMPLE
    .\scripts\dist-win.ps1
    .\scripts\dist-win.ps1 -Verbose

.NOTES
    Vyžaduje:
      - .NET 9 SDK  (dotnet --version)
      - vpk CLI     (dotnet tool install -g vpk)
    Výstup: release\Verdict-Setup-<verze>.exe
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Verze z .csproj ───────────────────────────────────────────────────────────
$csproj = Join-Path $PSScriptRoot "..\Verdict.Desktop\Verdict.Desktop.csproj"
[xml]$xml = Get-Content $csproj
$version = $xml.Project.PropertyGroup | Where-Object { $_.Version } | Select-Object -First 1 -ExpandProperty Version
if (-not $version) { throw "Nepodařilo se načíst <Version> z .csproj" }
Write-Host "Verze: $version" -ForegroundColor Cyan

# ── Cesty ─────────────────────────────────────────────────────────────────────
$root       = Resolve-Path (Join-Path $PSScriptRoot "..")
$publishDir = Join-Path $root "publish\win-x64"
$releaseDir = Join-Path $root "release"
$mainExe    = "Verdict.exe"
$icon       = Join-Path $root "build\icon.ico"

# ── 1. Publish ────────────────────────────────────────────────────────────────
Write-Host "`n[1/2] dotnet publish..." -ForegroundColor Yellow
if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }

dotnet publish `
    (Join-Path $root "Verdict.Desktop\Verdict.Desktop.csproj") `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=false `
    -o $publishDir

if ($LASTEXITCODE -ne 0) { throw "dotnet publish selhalo" }

# ── 2. vpk pack ───────────────────────────────────────────────────────────────
Write-Host "`n[2/2] vpk pack..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

$vpkArgs = @(
    "pack",
    "--packId",      "Verdict",
    "--packVersion", $version,
    "--packDir",     $publishDir,
    "--mainExe",     $mainExe,
    "--outputDir",   $releaseDir,
    "--packTitle",   "Verdict"
)
if (Test-Path $icon) {
    $vpkArgs += @("--icon", $icon)
}

& vpk @vpkArgs
if ($LASTEXITCODE -ne 0) { throw "vpk pack selhalo" }

# ── Výsledek ──────────────────────────────────────────────────────────────────
$setup = Get-ChildItem $releaseDir -Filter "Verdict*Setup*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($setup) {
    $mb = [math]::Round($setup.Length / 1MB, 1)
    Write-Host "`nHotovo: $($setup.FullName) ($mb MB)" -ForegroundColor Green
} else {
    Write-Host "`nHotovo — soubory v: $releaseDir" -ForegroundColor Green
    Get-ChildItem $releaseDir | ForEach-Object { Write-Host "  $_" }
}
