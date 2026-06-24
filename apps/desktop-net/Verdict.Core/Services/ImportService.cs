using System.Data;
using System.Globalization;
using System.Text;
using ExcelDataReader;
using Verdict.Core.Model;

namespace Verdict.Core.Services;

public sealed class ImportService
{
    private readonly IRaceService _svc;

    static ImportService()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public ImportService(IRaceService svc) => _svc = svc;

    // ── Preview ───────────────────────────────────────────────────────────────

    public ImportPreview NactiPreview(string cesta, IReadOnlyList<Kategorie> kategorie)
    {
        using var stream = File.Open(cesta, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        using var reader = ExcelReaderFactory.CreateReader(stream);
        var ds = reader.AsDataSet(new ExcelDataSetConfiguration
        {
            ConfigureDataTable = _ => new ExcelDataTableConfiguration { UseHeaderRow = true }
        });

        var listy = new List<ImportSheetPreview>();
        foreach (DataTable tabulka in ds.Tables)
        {
            var sheetNazev = tabulka.TableName;
            var kat = NajdiKategorii(sheetNazev, kategorie);
            var jezdci = ParseJezdci(tabulka);

            var existujici = kat is not null
                ? _svc.GetJezdci(kat.Id).Select(j => j.StCislo).Where(s => s.HasValue).ToHashSet()
                : new HashSet<int?>();

            int konflikty = jezdci.Count(j => j.StCislo.HasValue && existujici.Contains(j.StCislo));
            var losyVeXls = jezdci.Where(j => j.Los.HasValue).Select(j => j.Los!.Value).ToList();
            var losKolize = losyVeXls.GroupBy(l => l).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
            int bezLosu = jezdci.Count(j => !j.Los.HasValue);

            listy.Add(new ImportSheetPreview(
                Sheet: sheetNazev,
                MappedNazev: kat?.Nazev ?? sheetNazev,
                KategorieId: kat?.Id,
                Pocet: jezdci.Count,
                Konflikty: konflikty,
                LosKolize: losKolize,
                BezLosu: bezLosu,
                Jezdci: jezdci));
        }

        return new ImportPreview(Path.GetFileName(cesta), listy);
    }

    // ── Commit ────────────────────────────────────────────────────────────────

    public ImportResult Commit(ImportCommit commit)
    {
        int vlozeno = 0, prepsano = 0, preskoceno = 0;

        foreach (var list in commit.Listy)
        {
            var existujici = _svc.GetJezdci(list.KategorieId)
                .Where(j => j.StCislo.HasValue)
                .ToDictionary(j => j.StCislo!.Value, j => j.Id);

            foreach (var j in list.Jezdci)
            {
                if (j.StCislo.HasValue && existujici.TryGetValue(j.StCislo.Value, out int existId))
                {
                    if (commit.Policy == ImportPolicy.Skip)
                    {
                        preskoceno++;
                        continue;
                    }
                    // Overwrite — smaž a znovu vlož
                    _svc.SmazJezdce(existId);
                    _svc.VytvorJezdce(list.KategorieId, j);
                    prepsano++;
                }
                else
                {
                    _svc.VytvorJezdce(list.KategorieId, j);
                    vlozeno++;
                }
            }
        }

        return new ImportResult(vlozeno, prepsano, preskoceno);
    }

    // ── Privátní pomocné metody ───────────────────────────────────────────────

    private static Kategorie? NajdiKategorii(string sheetNazev, IReadOnlyList<Kategorie> kategorie)
    {
        var norm = Normalizuj(sheetNazev);
        return kategorie.FirstOrDefault(k => Normalizuj(k.Nazev) == norm)
            ?? kategorie.FirstOrDefault(k =>
                Normalizuj(k.Nazev).Contains(norm) || norm.Contains(Normalizuj(k.Nazev)));
    }

    private static List<ParsedJezdec> ParseJezdci(DataTable tabulka)
    {
        // Najdi sloupce podle normalizovaných názvů záhlaví
        var cols = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (int c = 0; c < tabulka.Columns.Count; c++)
        {
            string nazev = Normalizuj(tabulka.Columns[c].ColumnName);
            if (!string.IsNullOrEmpty(nazev))
                cols.TryAdd(nazev, c);
        }

        int? ColIdx(params string[] variace) =>
            variace.Select(v => cols.TryGetValue(v, out int i) ? (int?)i : null)
                   .FirstOrDefault(i => i.HasValue);

        int? stIdx  = ColIdx("st", "st.", "stc", "cislo", "startovni cislo");
        int? prIdx  = ColIdx("prijmeni");
        int? jmIdx  = ColIdx("jmeno");
        int? znIdx  = ColIdx("znacka", "auto", "vozidlo");
        int? mdIdx  = ColIdx("model");
        int? losIdx = ColIdx("los");
        int? rokIdx = ColIdx("rok", "narozeni", "rok narozeni");

        var vysledek = new List<ParsedJezdec>();
        foreach (DataRow row in tabulka.Rows)
        {
            string prijmeni = StrHodnota(row, prIdx) ?? "";
            string jmeno    = StrHodnota(row, jmIdx) ?? "";

            // Řádky bez jména přeskoč (prázdné nebo oddělovací)
            if (string.IsNullOrWhiteSpace(prijmeni) && string.IsNullOrWhiteSpace(jmeno))
                continue;

            vysledek.Add(new ParsedJezdec(
                Los:          IntHodnota(row, losIdx),
                StCislo:      IntHodnota(row, stIdx),
                Prijmeni:     prijmeni,
                Jmeno:        jmeno,
                Znacka:       StrHodnota(row, znIdx) ?? "",
                Model:        StrHodnota(row, mdIdx) ?? "",
                RokNarozeni:  IntHodnota(row, rokIdx)));
        }

        return vysledek;
    }

    private static string? StrHodnota(DataRow row, int? idx)
    {
        if (idx is null || row.IsNull(idx.Value)) return null;
        return row[idx.Value]?.ToString()?.Trim();
    }

    private static int? IntHodnota(DataRow row, int? idx)
    {
        if (idx is null || row.IsNull(idx.Value)) return null;
        var raw = row[idx.Value]?.ToString()?.Trim();
        return int.TryParse(raw, NumberStyles.Integer, CultureInfo.InvariantCulture, out int v) ? v : null;
    }

    private static string Normalizuj(string s)
    {
        var normalized = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(normalized.Length);
        foreach (char c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().ToLowerInvariant().Trim();
    }
}
