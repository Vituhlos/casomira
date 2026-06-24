namespace Verdict.Core.Model;

public record KlasifikaceRadek(
    int Poradi,
    int JezdecId,
    int? StCislo,
    string Prijmeni,
    string Jmeno,
    int? Los,
    Dictionary<string, int> PerKolo,   // KoloTyp.ToString() -> body
    int Celkem);

/// <summary>Radek agregovanych vysledku jednoho kola (Q1/Q2/Q3) — serazeno dle casu, body prideleeny.</summary>
public record QAgregatRadek(
    int JezdecId,
    int? StCislo,
    string Prijmeni,
    string Jmeno,
    string? Znacka,
    string? Model,
    int CisloJizdy,
    int? CasMs,
    int PenalizaceMs,
    int DeltaZJizdy,
    Stav Stav,
    int? Poradi,
    int? BodyAuto,
    int? BodyRucni,
    int? Body);

/// <summary>Radek celkovych vysledku (porad rizene finale, body jen z kvalifikace). CLAUDE.md §9.</summary>
public record CelkoveRadek(
    int Poradi,
    int JezdecId,
    int? StCislo,
    string Prijmeni,
    string Jmeno,
    int? Pq,    // porad po Q3
    int? Psf,   // porad v semifinale
    int? Pf,    // porad ve finale
    int Bq);    // body z kvalifikace (po Q3)
