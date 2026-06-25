// BackupTests.cs — záloha/obnova (JSON export/import).
// Port z src/main/backup/validate.test.ts + round-trip přes reálnou SQLite DB.

using FluentAssertions;
using Verdict.Core.Backup;
using Verdict.Core.Data;
using Verdict.Core.Model;
using Verdict.Core.Services;

namespace Verdict.Tests;

public class BackupValidatorTests
{
    private const int Schema = 14;

    private static string BackupJson(string format) => $$"""
        {
          "format": "{{format}}",
          "formatVersion": 1,
          "appVersion": "0.9.13-beta",
          "schemaVersion": 1,
          "exportedAt": "2026-06-17T00:00:00.000Z",
          "scope": "zavod",
          "zavody": [
            {
              "zavod": { "id": 1, "nazev": "Test", "datum": "2026-06-17", "misto": "Kotlina", "typ": "RAC" },
              "kategorie": [], "skupiny": [], "jezdci": [], "kola": [], "jizdy": [],
              "rost_pozice": [], "vysledky": [], "mereni": [], "uprava_log": []
            }
          ]
        }
        """;

    [Fact]
    public void PrijmeNovyFormatVerdictu()
    {
        var parsed = BackupSerializer.Parse(BackupJson(BackupFormaty.Verdict), Schema);
        parsed.Format.Should().Be("verdict-backup");
        parsed.Zavody.Should().HaveCount(1);
    }

    [Fact]
    public void PrijmeLegacyFormatCasomiry()
    {
        var parsed = BackupSerializer.Parse(BackupJson(BackupFormaty.Legacy), Schema);
        parsed.Format.Should().Be("casomira-backup");
        parsed.Zavody[0].Zavod.Nazev.Should().Be("Test");
    }

    [Fact]
    public void OdmitneNeznamyFormatSCitelnouChybou()
    {
        var act = () => BackupSerializer.Parse(BackupJson("unknown-backup"), Schema);
        act.Should().Throw<BackupValidationException>()
            .Which.Message.Should().Contain("verdict-backup").And.Contain("casomira-backup");
    }

    [Fact]
    public void OdmitneNeplatnyJson()
    {
        var act = () => BackupSerializer.Parse("{ tohle není json", Schema);
        act.Should().Throw<BackupValidationException>();
    }

    [Fact]
    public void OdmitneNovejsiSchema()
    {
        var json = BackupJson(BackupFormaty.Verdict).Replace("\"schemaVersion\": 1", "\"schemaVersion\": 999");
        var act = () => BackupSerializer.Parse(json, Schema);
        act.Should().Throw<BackupValidationException>().Which.Message.Should().Contain("novější");
    }
}

public class BackupRoundTripTests : IDisposable
{
    private readonly string _path;
    private readonly DbContext _db;
    private readonly RaceService _svc;
    private readonly BackupService _backup;

    public BackupRoundTripTests()
    {
        _path = Path.Combine(Path.GetTempPath(), $"verdict-test-{Guid.NewGuid():N}.db");
        _db = new DbContext(_path);
        _db.Open();
        _svc = new RaceService(_db);
        _backup = new BackupService(_db);
    }

    private int VytvorTestovaciZavod()
    {
        int zavodId = _svc.VytvorZavod(new NovyZavod(
            "Pohár Kotlina", "2026-06-25", "Kotlina", RaceType.RAC,
            [new KategorieVstup("N1600", Ruleset.STANDARD)]));
        var kat = _svc.GetKategorie(zavodId)[0];
        _svc.VytvorJezdce(kat.Id, new ParsedJezdec(1, 42, "Novák", "Jan", "Škoda", "Fabia", 1990));
        _svc.VytvorJezdce(kat.Id, new ParsedJezdec(2, 7, "Svoboda", "Petr", "Ford", "Fiesta", 1985));
        return zavodId;
    }

    [Fact]
    public void ExportZavod_ObsahujeZavodSJezdci()
    {
        int zavodId = VytvorTestovaciZavod();

        var data = _backup.ExportZavod(zavodId);
        data.Scope.Should().Be("zavod");
        data.Format.Should().Be("verdict-backup");
        data.Zavody.Should().HaveCount(1);

        var blok = data.Zavody[0];
        blok.Zavod.Nazev.Should().Be("Pohár Kotlina");
        blok.Kategorie.Should().ContainSingle(k => k.Nazev == "N1600");
        blok.Jezdci.Should().HaveCount(2);
        blok.Jezdci.Should().Contain(j => j.Prijmeni == "Novák" && j.StCislo == 42);
    }

    [Fact]
    public void ExportDatabaze_ZahrnujeGlobalniTabulky()
    {
        VytvorTestovaciZavod();

        var data = _backup.ExportDatabaze();
        data.Scope.Should().Be("database");
        data.Zavody.Should().Contain(z => z.Zavod.Nazev == "Pohár Kotlina");
        // globální tabulky (žebříček/pravidla) se exportují jen u scope=database
        data.Zebricek.Should().NotBeNullOrEmpty();
        data.Pravidla.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void Serialize_Parse_JeStabilni()
    {
        int zavodId = VytvorTestovaciZavod();

        string json = BackupSerializer.Serialize(_backup.ExportZavod(zavodId));
        // snake_case klíče v JSON (kompatibilní s Electron verzí)
        json.Should().Contain("\"st_cislo\"").And.Contain("\"rost_pozice\"");

        var zpet = BackupSerializer.Parse(json, _backup.AktualniSchemaVersion());
        zpet.Zavody[0].Jezdci.Should().HaveCount(2);
    }

    [Fact]
    public void Obnova_PridaZavodNedestruktivne()
    {
        int zavodId = VytvorTestovaciZavod();
        // jeden závod (scope=zavod), ať obnova nezávisí na seed datech
        string json = BackupSerializer.Serialize(_backup.ExportZavod(zavodId));

        int pred = _svc.GetZavody().Count;

        var vysledek = _backup.ObnovZTextu(json);

        vysledek.ZavodIds.Should().HaveCount(1);
        vysledek.PosledniNazev.Should().Be("Pohár Kotlina");

        // původní data zůstala + přibyla právě jedna kopie
        var zavody = _svc.GetZavody();
        zavody.Should().HaveCount(pred + 1);
        zavody.Count(z => z.Nazev == "Pohár Kotlina").Should().Be(2);

        // obnovená kopie má kompletní data (kategorie + 2 jezdce)
        int novyId = vysledek.ZavodIds[0];
        var kat = _svc.GetKategorie(novyId).Should().ContainSingle().Subject;
        _svc.GetJezdci(kat.Id).Should().HaveCount(2);
    }

    public void Dispose()
    {
        _db.Dispose();
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        foreach (var p in new[] { _path, _path + "-wal", _path + "-shm" })
        {
            try { if (File.Exists(p)) File.Delete(p); } catch { /* best-effort */ }
        }
    }
}
