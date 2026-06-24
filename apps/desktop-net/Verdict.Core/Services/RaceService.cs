using Dapper;
using Verdict.Core.Data;
using Verdict.Core.Model;

namespace Verdict.Core.Services;

/// <summary>
/// Implementace IRaceService přes Dapper + DbContext.
/// Phase 2: pouze závody + kategorie (shell potřebuje jen to).
/// Phase 3: rozšíří o jezdce, rošty, výsledky, klasifikaci, etc.
/// </summary>
public sealed class RaceService : IRaceService
{
    private readonly DbContext _db;

    public RaceService(DbContext db) => _db = db;

    // ── privátní DTO pro Dapper (enums jako string) ───────────────────────────

    private sealed record ZavodRow(
        int Id, string Nazev, string Datum, string Misto, string Typ,
        int PocetKategorii, int PocetJezdcu);

    private sealed record KategorieRow(
        int Id, int ZavodId, string Nazev, string Ruleset,
        int Pocet, int FinaleVelikost);

    // ── Závody ────────────────────────────────────────────────────────────────

    public IReadOnlyList<ZavodInfo> GetZavody()
    {
        const string sql = """
            SELECT z.id, z.nazev, z.datum, z.misto, z.typ,
                   COUNT(DISTINCT k.id)  AS pocet_kategorii,
                   COUNT(DISTINCT j.id)  AS pocet_jezdcu
            FROM zavod z
            LEFT JOIN kategorie k ON k.zavod_id = z.id
            LEFT JOIN jezdec j    ON j.kategorie_id = k.id
            GROUP BY z.id
            ORDER BY z.datum DESC, z.id DESC
            """;
        return _db.Connection
            .Query<ZavodRow>(sql)
            .Select(Map)
            .ToList();
    }

    public ZavodInfo? GetZavod(int zavodId)
    {
        const string sql = """
            SELECT z.id, z.nazev, z.datum, z.misto, z.typ,
                   COUNT(DISTINCT k.id)  AS pocet_kategorii,
                   COUNT(DISTINCT j.id)  AS pocet_jezdcu
            FROM zavod z
            LEFT JOIN kategorie k ON k.zavod_id = z.id
            LEFT JOIN jezdec j    ON j.kategorie_id = k.id
            WHERE z.id = @ZavodId
            GROUP BY z.id
            """;
        var row = _db.Connection.QueryFirstOrDefault<ZavodRow>(sql, new { ZavodId = zavodId });
        return row is null ? null : Map(row);
    }

    public int VytvorZavod(NovyZavod vstup)
    {
        using var tx = _db.Connection.BeginTransaction();
        try
        {
            const string sql = """
                INSERT INTO zavod (nazev, datum, misto, typ)
                VALUES (@Nazev, @Datum, @Misto, @Typ)
                """;
            _db.Connection.Execute(sql, new
            {
                vstup.Nazev, vstup.Datum, vstup.Misto,
                Typ = vstup.Typ.ToString()
            }, tx);

            int zavodId = (int)_db.Connection.ExecuteScalar<long>("SELECT last_insert_rowid()", null, tx);

            foreach (var kat in vstup.Kategorie)
            {
                _db.Connection.Execute(
                    "INSERT INTO kategorie (zavod_id, nazev, ruleset) VALUES (@Z, @N, @R)",
                    new { Z = zavodId, N = kat.Nazev, R = kat.Ruleset.ToString() }, tx);
            }

            tx.Commit();
            return zavodId;
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public void AktualizujZavod(ZavodUprava uprava)
    {
        using var tx = _db.Connection.BeginTransaction();
        try
        {
            _db.Connection.Execute(
                "UPDATE zavod SET nazev=@Nazev, datum=@Datum, misto=@Misto WHERE id=@Id",
                new { uprava.Nazev, uprava.Datum, uprava.Misto, uprava.Id }, tx);
            tx.Commit();
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public void SmazZavod(int zavodId)
    {
        _db.Connection.Execute("DELETE FROM zavod WHERE id = @Id", new { Id = zavodId });
    }

    // ── Kategorie ─────────────────────────────────────────────────────────────

    public IReadOnlyList<Kategorie> GetKategorie(int zavodId)
    {
        const string sql = """
            SELECT k.id, k.zavod_id, k.nazev, k.ruleset, k.finale_velikost,
                   COUNT(j.id) AS pocet
            FROM kategorie k
            LEFT JOIN jezdec j ON j.kategorie_id = k.id
            WHERE k.zavod_id = @ZavodId
            GROUP BY k.id
            ORDER BY k.id
            """;
        return _db.Connection
            .Query<KategorieRow>(sql, new { ZavodId = zavodId })
            .Select(r => new Kategorie(
                r.Id, r.ZavodId, r.Nazev,
                Enum.Parse<Ruleset>(r.Ruleset),
                r.Pocet, r.FinaleVelikost))
            .ToList();
    }

    public int VytvorKategorii(int zavodId, KategorieVstup vstup)
    {
        _db.Connection.Execute(
            "INSERT INTO kategorie (zavod_id, nazev, ruleset) VALUES (@Z, @N, @R)",
            new { Z = zavodId, N = vstup.Nazev, R = vstup.Ruleset.ToString() });
        return (int)_db.Connection.ExecuteScalar<long>("SELECT last_insert_rowid()");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static ZavodInfo Map(ZavodRow r) => new(
        r.Id, r.Nazev, r.Datum, r.Misto,
        Enum.Parse<RaceType>(r.Typ),
        r.PocetKategorii, r.PocetJezdcu);
}
