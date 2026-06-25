using System.Text.Json.Serialization;

namespace Verdict.Core.Backup;

// Formát zálohy Verdictu — JSON, verze 1. Záměrně byte-kompatibilní s původní
// Electron verzí (src/main/backup), aby šly zálohy přenášet mezi oběma appkami.
// Port z src/main/backup/types.ts.

public static class BackupFormaty
{
    public const string Verdict = "verdict-backup";
    public const string Legacy  = "casomira-backup";   // starší Časomíra
    public const int    Verze   = 1;
}

/// <summary>Chyba ve struktuře / formátu zálohy (čitelná pro uživatele).</summary>
public sealed class BackupValidationException(string message) : Exception(message);

// ── Řádky tabulek ─────────────────────────────────────────────────────────────
// PascalCase property → snake_case JSON (přes JsonNamingPolicy.SnakeCaseLower)
// → snake_case DB sloupec (přes Dapper MatchNamesWithUnderscores). Jeden zdroj.

public sealed class BackupZavodRow
{
    public int Id { get; set; }
    public string Nazev { get; set; } = "";
    public string Datum { get; set; } = "";
    public string Misto { get; set; } = "";
    public string Typ { get; set; } = "RAC";
}

public sealed class BackupKategorieRow
{
    public int Id { get; set; }
    public int ZavodId { get; set; }
    public string Nazev { get; set; } = "";
    public string Ruleset { get; set; } = "STANDARD";
    public int FinaleVelikost { get; set; } = 8;
}

public sealed class BackupSkupinaRow
{
    public int Id { get; set; }
    public int KategorieId { get; set; }
    public string Nazev { get; set; } = "";
}

public sealed class BackupJezdecRow
{
    public int Id { get; set; }
    public int KategorieId { get; set; }
    public int? StCislo { get; set; }
    public string Prijmeni { get; set; } = "";
    public string Jmeno { get; set; } = "";
    public string Znacka { get; set; } = "";
    public string Model { get; set; } = "";
    public int? RokNarozeni { get; set; }
    public int? Los { get; set; }
}

public sealed class BackupKoloRow
{
    public int Id { get; set; }
    public int KategorieId { get; set; }
    public string Typ { get; set; } = "";
    public int Poradi { get; set; }
}

public sealed class BackupJizdaRow
{
    public int Id { get; set; }
    public int KoloId { get; set; }
    public int Cislo { get; set; }
    public int? SkupinaId { get; set; }
}

public sealed class BackupRostPoziceRow
{
    public int Id { get; set; }
    public int JizdaId { get; set; }
    public int Pozice { get; set; }
    public int JezdecId { get; set; }
}

public sealed class BackupVysledekRow
{
    public int Id { get; set; }
    public int JizdaId { get; set; }
    public int JezdecId { get; set; }
    public int? NamerenyCasMs { get; set; }
    public int PenalizaceMs { get; set; }
    public string Stav { get; set; } = "OK";
    public int? RucniPoradi { get; set; }
    public int? Poradi { get; set; }
    public int? Body { get; set; }
    public int? BodyRucni { get; set; }
    public string? Poznamka { get; set; }
}

public sealed class BackupMereniRow
{
    public int Id { get; set; }
    public int JizdaId { get; set; }
    public int? ZavodId { get; set; }
    public int PoradiKliku { get; set; }
    public int CasMs { get; set; }
    public int? JezdecId { get; set; }
}

public sealed class BackupUpravaLogRow
{
    public int Id { get; set; }
    public int VysledekId { get; set; }
    public string Typ { get; set; } = "";
    public int? Hodnota { get; set; }
    public string Duvod { get; set; } = "";
    public string Rozhodl { get; set; } = "ředitel";
    public string Kdy { get; set; } = "";
}

public sealed class BackupZebricekRow
{
    public int Id { get; set; }
    public string Ruleset { get; set; } = "STANDARD";
    public int Poradi { get; set; }
    public int Body { get; set; }
}

public sealed class BackupPravidlaRow
{
    public int Id { get; set; }
    public string Ruleset { get; set; } = "STANDARD";
    public int MaxNaJizdu { get; set; }
    public int? SfPrah { get; set; }
    public int? SfMax { get; set; }
    public int? DnfOffset { get; set; }
    public int? DnsOffset { get; set; }
    public int? DqOffset { get; set; }
    public int? DnfBody { get; set; }
    public int? DnsBody { get; set; }
    public int? DqBody { get; set; }
}

public sealed class BackupNastaveniRow
{
    public string Klic { get; set; } = "";
    public string? Hodnota { get; set; }
}

/// <summary>Kompletní data jednoho závodu (všechny tabulky vázané na závod).</summary>
public sealed class BackupZavodPayload
{
    public BackupZavodRow Zavod { get; set; } = new();
    public List<BackupKategorieRow> Kategorie { get; set; } = [];
    public List<BackupSkupinaRow> Skupiny { get; set; } = [];
    public List<BackupJezdecRow> Jezdci { get; set; } = [];
    public List<BackupKoloRow> Kola { get; set; } = [];
    public List<BackupJizdaRow> Jizdy { get; set; } = [];
    public List<BackupRostPoziceRow> RostPozice { get; set; } = [];
    public List<BackupVysledekRow> Vysledky { get; set; } = [];
    public List<BackupMereniRow> Mereni { get; set; } = [];
    public List<BackupUpravaLogRow> UpravaLog { get; set; } = [];
}

/// <summary>Kořen zálohy — jeden závod (scope=zavod) nebo celá databáze (scope=database).</summary>
public sealed class BackupFile
{
    [JsonPropertyName("format")]        public string Format { get; set; } = BackupFormaty.Verdict;
    [JsonPropertyName("formatVersion")] public int FormatVersion { get; set; } = BackupFormaty.Verze;
    [JsonPropertyName("appVersion")]    public string AppVersion { get; set; } = "0.0.0";
    [JsonPropertyName("schemaVersion")] public int SchemaVersion { get; set; }
    [JsonPropertyName("exportedAt")]    public string ExportedAt { get; set; } = "";
    [JsonPropertyName("scope")]         public string Scope { get; set; } = "zavod";

    public List<BackupZavodPayload> Zavody { get; set; } = [];

    // Globální tabulky — jen u scope=database. U scope=zavod se z výstupu vynechají.
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<BackupZebricekRow>? Zebricek { get; set; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<BackupPravidlaRow>? Pravidla { get; set; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<BackupNastaveniRow>? Nastaveni { get; set; }
}

/// <summary>Výsledek obnovy ze zálohy.</summary>
public sealed record BackupRestoreResult(IReadOnlyList<int> ZavodIds, string PosledniNazev);
