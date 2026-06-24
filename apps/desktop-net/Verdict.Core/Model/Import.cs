namespace Verdict.Core.Model;

/// <summary>Náhled jednoho listu Excelu před zápisem.</summary>
public record ImportSheetPreview(
    string Sheet,
    string MappedNazev,
    int? KategorieId,
    int Pocet,
    int Konflikty,
    List<int> LosKolize,
    int BezLosu,
    List<ParsedJezdec> Jezdci);

public record ImportPreview(string Soubor, List<ImportSheetPreview> Listy);

public record ImportCommitSheet(int KategorieId, List<ParsedJezdec> Jezdci);

public record ImportCommit(List<ImportCommitSheet> Listy, ImportPolicy Policy);

public record ImportResult(int Vlozeno, int Prepsano, int Preskoceno);
