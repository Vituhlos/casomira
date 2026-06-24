namespace Verdict.Core.Model;

/// <summary>Jeden slot v roštu jízdy (pozice 1..8).</summary>
public record RostSlot(int Pozice, Jezdec? Jezdec);

public record RostJizda(int Id, int Cislo, List<RostSlot> Sloty);

public record RostKolo(int KoloId, List<RostJizda> Jizdy);

/// <summary>Odpověď na zápis st. čísla do slotu.</summary>
public record SetRostResult(bool Ok, Jezdec? Jezdec, bool Duplicitni = false);

public record RostNavrhJizda(int Cislo, List<Jezdec> Jezdci);

/// <summary>Návrh automaticky vygenerovaného roštu (před zápisem).</summary>
public record RostNavrh(
    bool Ok,
    string? Chyba,
    bool Obsazeno,
    List<RostNavrhJizda> Jizdy,
    int PocetJizd,
    int MinJizd,
    int MaxJizd,
    /// <summary>U finále: počet finalistů.</summary>
    int? FinaleVelikost = null);

public record RostZapisJizda(int Cislo, List<int> JezdecIds);
