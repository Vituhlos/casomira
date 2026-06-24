using Verdict.Core.Model;

namespace Verdict.Core.Services;

/// <summary>Jeden tab fáze — label pro UI + klíč pro PDF/routing.</summary>
public record FazeTabItem(ListKey Key, string Label);

/// <summary>
/// Statický seznam fází pro daný typ závodu. Pořadí přesně dle CLAUDE.md §12.
/// RAC: 14 fází (vč. Klasifikace po Q2); RX: 13 fází (bez ní).
/// </summary>
public static class FazeHelper
{
    private static readonly FazeTabItem[] RacFaze =
    [
        new(ListKey.Start,     "Startovní listina"),
        new(ListKey.GridQ1,    "Q1 — Rošty"),
        new(ListKey.ResQ1,     "Q1 — Výsledky"),
        new(ListKey.GridQ2,    "Q2 — Rošty"),
        new(ListKey.ResQ2,     "Q2 — Výsledky"),
        new(ListKey.ClassQ2,   "Klasifikace po Q2"),
        new(ListKey.GridQ3,    "Q3 — Rošty"),
        new(ListKey.ResQ3,     "Q3 — Výsledky"),
        new(ListKey.ClassQ3,   "Klasifikace po Q3"),
        new(ListKey.SfRost,    "Semifinále — Rošty"),
        new(ListKey.SfRes,     "Semifinále — Výsledky"),
        new(ListKey.FinalRost, "Finále — Rošty"),
        new(ListKey.FinalRes,  "Finále — Výsledky"),
        new(ListKey.Overall,   "Celkové výsledky"),
    ];

    private static readonly FazeTabItem[] RxFaze =
    [
        new(ListKey.Start,     "Startovní listina"),
        new(ListKey.GridQ1,    "Q1 — Rošty"),
        new(ListKey.ResQ1,     "Q1 — Výsledky"),
        new(ListKey.GridQ2,    "Q2 — Rošty"),
        new(ListKey.ResQ2,     "Q2 — Výsledky"),
        new(ListKey.GridQ3,    "Q3 — Rošty"),
        new(ListKey.ResQ3,     "Q3 — Výsledky"),
        new(ListKey.ClassQ3,   "Klasifikace po Q3"),
        new(ListKey.SfRost,    "Semifinále — Rošty"),
        new(ListKey.SfRes,     "Semifinále — Výsledky"),
        new(ListKey.FinalRost, "Finále — Rošty"),
        new(ListKey.FinalRes,  "Finále — Výsledky"),
        new(ListKey.Overall,   "Celkové výsledky"),
    ];

    public static IReadOnlyList<FazeTabItem> GetFaze(RaceType typ) =>
        typ == RaceType.RAC ? RacFaze : RxFaze;
}
