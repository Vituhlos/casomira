namespace Verdict.Core.Scoring;

// Čistá logika závěru závodu: kvalifikace, nasazení SF/finále, celkové pořadí.
// Žádná databáze — RaceService dodá data a tyto funkce zavolá.
// Platí pro RAC Race i RX Cup (STANDARD). Pravidla: CLAUDE.md §8–§9.
// Port z src/main/zaver.ts.

public record CelkovyVstup(int JezdecId, int? Pq, int? Psf, int? Pf, int Bq);

public static class ZaverEngine
{
    /// <summary>Práh počtu kvalifikovaných, od kterého se koná semifinále (RAC).</summary>
    public const int PrahSF = 12;

    /// <summary>
    /// Kvalifikace do SF/finále: aspoň jedna Q jízda KOMPLETNÍ (OK + čas) a zároveň
    /// aspoň dvě jízdy, do kterých jezdec reálně nastoupil (OK nebo DNF; NE DNS/DQ).
    /// </summary>
    public static bool JeKvalifikovan(int dokoncil, int odstartovalBezDq) =>
        dokoncil >= 1 && odstartovalBezDq >= 2;

    /// <summary>
    /// Nasazení do semifinále: z pořadí dle Klasifikace po Q3 (jen kvalifikovaní)
    /// jdou liché pozice do 1. jízdy, sudé do 2. jízdy. Max 16 jezdců (2×8).
    /// </summary>
    public static (List<int> Heat1, List<int> Heat2) NasazSF(IReadOnlyList<int> poradiQ3)
    {
        var heat1 = new List<int>();
        var heat2 = new List<int>();
        int n = Math.Min(poradiQ3.Count, 16);
        for (int i = 0; i < n; i++)
        {
            if (i % 2 == 0) heat1.Add(poradiQ3[i]);  // 1., 3., 5., … (liché)
            else            heat2.Add(poradiQ3[i]);  // 2., 4., 6., … (sudé)
        }
        return (heat1, heat2);
    }

    /// <summary>
    /// Nasazení finále z postupujících SF: spáruje jezdce na stejné pozici z obou
    /// jízd; z dvojice jede dřív ten s víc body po Q3 (při shodě první z 1. jízdy).
    /// </summary>
    public static List<int> NasazFinaleZeSF(
        IReadOnlyList<int> postup1,
        IReadOnlyList<int> postup2,
        IReadOnlyDictionary<int, int> bodyQ3)
    {
        var outIds = new List<int>();
        int dvojic = Math.Max(postup1.Count, postup2.Count);
        for (int p = 0; p < dvojic; p++)
        {
            int? a = p < postup1.Count ? postup1[p] : null;
            int? b = p < postup2.Count ? postup2[p] : null;
            if (a is not null && b is not null)
            {
                int ba = bodyQ3.GetValueOrDefault(a.Value);
                int bb = bodyQ3.GetValueOrDefault(b.Value);
                if (ba >= bb) { outIds.Add(a.Value); outIds.Add(b.Value); }
                else          { outIds.Add(b.Value); outIds.Add(a.Value); }
            }
            else if (a is not null) outIds.Add(a.Value);
            else if (b is not null) outIds.Add(b.Value);
        }
        return outIds;
    }

    /// <summary>
    /// Celkové pořadí: NEsčítá body. Řídí ho finále —
    ///   1) finalisté dle finále, 2) za nimi SF nepostupující dle SF pořadí
    ///   (tiebreak body po Q3), 3) zbytek dle Klasifikace po Q3.
    /// </summary>
    public static List<int> CelkovePoradi(IReadOnlyList<CelkovyVstup> vstupy)
    {
        var finaliste = vstupy
            .Where(v => v.Pf is not null)
            .OrderBy(v => v.Pf!.Value)
            .ToList();
        var finalSet = finaliste.Select(v => v.JezdecId).ToHashSet();

        var sfNepostoupili = vstupy
            .Where(v => v.Psf is not null && !finalSet.Contains(v.JezdecId))
            .OrderBy(v => v.Psf!.Value)
            .ThenByDescending(v => v.Bq)
            .ToList();
        var sfSet = vstupy.Where(v => v.Psf is not null).Select(v => v.JezdecId).ToHashSet();

        var zbytek = vstupy
            .Where(v => !finalSet.Contains(v.JezdecId) && !sfSet.Contains(v.JezdecId))
            .OrderBy(v => v.Pq ?? int.MaxValue)
            .ToList();

        return finaliste.Concat(sfNepostoupili).Concat(zbytek)
            .Select(v => v.JezdecId).ToList();
    }
}
