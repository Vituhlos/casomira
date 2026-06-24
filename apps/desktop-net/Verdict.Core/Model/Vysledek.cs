namespace Verdict.Core.Model;

public record VysledekRadek(
    int VysledekId,
    int JezdecId,
    int? StCislo,
    string Prijmeni,
    string Jmeno,
    string Znacka,
    string Model,
    int? MerCasMs,        // DB: namereny_cas_ms — surove mereni, NEprehravat
    int PenalizaceMs,
    Stav Stav,
    int? Poradi,
    int? Body,
    int? BodyRucni,
    int? RucniPoradi,
    UpravaTyp? UpravaTyp,
    int? UpravaHodnota,
    string? UpravaDuvod,
    string? UpravaKdy);

public record VysledekJizda(int Id, int Cislo, List<VysledekRadek> Vysledky);

public record VysledekKolo(int KoloId, List<VysledekJizda> Jizdy);

public record SetVysledekArg(
    int JizdaId,
    int JezdecId,
    int? CasMs = null,
    Stav? Stav = null);
