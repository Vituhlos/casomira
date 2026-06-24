namespace Verdict.Core.Model;

public record Zavod(int Id, string Nazev, string Datum, string Misto, RaceType Typ);

/// <summary>Závod v úvodním seznamu s dopočtenými počty.</summary>
public record ZavodInfo(
    int Id, string Nazev, string Datum, string Misto, RaceType Typ,
    int PocetKategorii, int PocetJezdcu);

public record KategorieVstup(string Nazev, Ruleset Ruleset);

public record NovyZavod(
    string Nazev, string Datum, string Misto, RaceType Typ,
    List<KategorieVstup> Kategorie);

/// <summary>Volitelné kategorie: když je vyplněno, synchronizuje seznam (chybějící se smažou).</summary>
public record ZavodUprava(
    int Id, string Nazev, string Datum, string Misto,
    List<KategorieVstup>? Kategorie = null);

public record Kategorie(
    int Id, int ZavodId, string Nazev, Ruleset Ruleset,
    /// <summary>Počet jezdců — dopočítává se, není to sloupec v DB.</summary>
    int Pocet,
    int FinaleVelikost);
