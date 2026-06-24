using Verdict.Core.Model;

namespace Verdict.Core.Services;

// Výchozí kategorie dle typu závodu — předvyplní se při zakládání, dají se upravit.
// Výchozí ruleset je STANDARD; Šotolinu si uživatel přidá ručně (jen RAC).
// Port z src/renderer/src/data/raceDefaults.ts.
public static class RaceDefaults
{
    public static IReadOnlyList<string> Vychozi(RaceType typ) => typ switch
    {
        RaceType.RX =>
            ["DX", "N1400", "N1600", "N1600+", "S1400", "S1600", "S1600+", "S4x4", "Škoda Cup"],
        _ =>
            ["Junior", "N1400", "N1600", "N1600+", "S1600", "S1600+", "Tuning",
             "Škoda Cup", "Cross Cup", "Dámský pohár"]
    };

    /// <summary>Nabídka chipů: u RAC navíc volitelná Šotolina (není předvybraná).</summary>
    public static IReadOnlyList<string> Nabidka(RaceType typ) => typ == RaceType.RX
        ? Vychozi(typ)
        : [.. Vychozi(typ), "Šotolina"];

    public static string Popis(RaceType typ) =>
        typ == RaceType.RAC ? "RAC Race (Hobby Rallycross)" : "RX Cup";
}
