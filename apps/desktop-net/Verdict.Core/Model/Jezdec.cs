namespace Verdict.Core.Model;

public record Jezdec(
    int Id, int KategorieId,
    int? StCislo,
    string Prijmeni, string Jmeno,
    string Znacka, string Model,
    int? RokNarozeni,
    int? Los);

public record JezdecUprava(int Id, JezdecPole Pole, object? Hodnota);

/// <summary>Jezdec načtený z Excelu — ještě není v databázi.</summary>
public record ParsedJezdec(
    int? Los, int? StCislo,
    string Prijmeni, string Jmeno,
    string Znacka, string Model,
    int? RokNarozeni);
