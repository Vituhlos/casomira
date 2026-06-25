using System.Text.Json;
using System.Text.Json.Serialization;

namespace Verdict.Core.Backup;

// Serializace + validace zálohy. Port z src/main/backup/validate.ts a meta.ts.
// PropertyNamingPolicy = SnakeCaseLower → row property NamerenyCasMs ⇄ "namereny_cas_ms".
// Camel-case obálka (formatVersion, appVersion…) má [JsonPropertyName] v BackupFile.

public static class BackupSerializer
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
    };

    public static string Serialize(BackupFile data) => JsonSerializer.Serialize(data, Options);

    /// <summary>
    /// Načte JSON text a ověří strukturu. Při chybě hodí BackupValidationException.
    /// Akceptuje nový formát „verdict-backup" i legacy „casomira-backup".
    /// </summary>
    public static BackupFile Parse(string text, int aktualniSchemaVersion)
    {
        BackupFile? data;
        try
        {
            data = JsonSerializer.Deserialize<BackupFile>(text, Options);
        }
        catch (JsonException)
        {
            throw new BackupValidationException("Soubor není platný JSON.");
        }

        if (data is null)
            throw new BackupValidationException("Záloha musí být JSON objekt.");

        if (data.Format != BackupFormaty.Verdict && data.Format != BackupFormaty.Legacy)
            throw new BackupValidationException(
                "Neznámý formát souboru. Očekávána záloha Verdictu (verdict-backup) " +
                "nebo starší Časomíry (casomira-backup).");

        if (data.FormatVersion < 1 || data.FormatVersion > BackupFormaty.Verze)
            throw new BackupValidationException(
                $"Nepodporovaná verze zálohy ({data.FormatVersion}). Aktualizujte aplikaci.");

        if (data.SchemaVersion < 1)
            throw new BackupValidationException("Záloha neobsahuje platné číslo verze schématu.");

        if (data.SchemaVersion > aktualniSchemaVersion)
            throw new BackupValidationException(
                $"Záloha pochází z novější verze databáze (schéma {data.SchemaVersion}). " +
                "Aktualizujte aplikaci.");

        if (data.Scope is not ("zavod" or "database"))
            throw new BackupValidationException("Neplatný rozsah zálohy (scope).");

        if (data.Zavody.Count == 0)
            throw new BackupValidationException("Záloha neobsahuje žádný závod.");

        for (int i = 0; i < data.Zavody.Count; i++)
        {
            var z = data.Zavody[i].Zavod;
            if (string.IsNullOrEmpty(z.Nazev) || string.IsNullOrEmpty(z.Datum))
                throw new BackupValidationException($"Závod #{i + 1}: neplatný záznam závodu.");
        }

        return data;
    }
}

/// <summary>Bezpečné názvy souborů zálohy. Port z src/main/backup/filename.ts.</summary>
public static class BackupNazev
{
    private static readonly char[] Zakazane = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

    /// <summary>Odstraní znaky zakázané v názvu souboru; zachová diakritiku.</summary>
    public static string BezpecneFsJmeno(string s, int maxLen = 80)
    {
        var sb = new System.Text.StringBuilder(s.Length);
        foreach (char ch in s)
        {
            if (Array.IndexOf(Zakazane, ch) >= 0 || char.IsControl(ch)) sb.Append(' ');
            else sb.Append(ch);
        }
        // vícenásobné mezery → jedna, ořež okraje a koncové tečky/mezery
        var slozene = string.Join(' ', sb.ToString().Split(' ', StringSplitOptions.RemoveEmptyEntries));
        var baze = slozene.TrimEnd('.', ' ').Trim();
        if (baze.Length == 0) baze = "zavod";
        return baze.Length > maxLen ? baze[..maxLen].Trim() : baze;
    }

    /// <summary>Výchozí název: Zaloha_&lt;název&gt;_&lt;datum&gt;.json</summary>
    public static string NavrhProZavod(string nazev, string datum) =>
        $"Zaloha_{BezpecneFsJmeno(nazev)}_{datum.Replace("-", "")}.json";

    /// <summary>Výchozí název pro zálohu celé databáze.</summary>
    public static string NavrhProVse(string datumIso) =>
        $"Zaloha_vsechny_zavody_{datumIso[..Math.Min(10, datumIso.Length)].Replace("-", "")}.json";
}
