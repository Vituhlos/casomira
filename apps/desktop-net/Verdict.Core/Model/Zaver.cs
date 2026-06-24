namespace Verdict.Core.Model;

/// <summary>Stav zaveru zavodu pro kategorii (semifinale / finale). CLAUDE.md §8.</summary>
public record ZaverStav(
    int Kvalifikovani,
    int PrahSF,
    bool SfSeKona,
    bool SfHotovo,
    bool FinaleHotovo,
    int FinaleVelikost);
