namespace Verdict.Core.Model;

/// <summary>Casova penalizace reditele — hodnota v sekundach. CLAUDE.md §13 faze2.</summary>
public record CasovaPenalizaceArg(int JizdaId, int JezdecId, int Sekundy, string Duvod);

/// <summary>Bodova penalizace reditele — delta vuci automatickym bodum z jizdy.</summary>
public record BodovaPenalizaceArg(int JizdaId, int JezdecId, int Delta, string Duvod);

/// <summary>Posun poradi v jizde — cilova pozice (1 = prvni). CLAUDE.md §13 faze2.</summary>
public record PosunPoradiArg(int JizdaId, int JezdecId, int Poradi, string Duvod);

/// <summary>Zruseni penalizace reditele (nebo vsech aktivnich zasahu).</summary>
public record ZrusPenalizaciArg(
    int JizdaId,
    int JezdecId,
    /// <summary>Ktery druh zrusit; null = vsechny aktivni zasahy.</summary>
    UpravaTyp? Typ,
    string Duvod);

/// <summary>Jeden radek audit logu zasahu reditele (s kontextem z JOIN).</summary>
public record UpravaLogRadek(
    int Id,
    int VysledekId,
    UpravaTyp Typ,
    int? Hodnota,
    string Duvod,
    string Rozhodl,
    string Kdy,
    // kontext (JOIN)
    int JezdecId,
    int? StCislo,
    string Prijmeni,
    string Jmeno,
    KoloTyp KoloTyp,
    int JizdaCislo,
    string KategorieNazev);
