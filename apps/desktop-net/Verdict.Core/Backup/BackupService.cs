using System.Reflection;
using Dapper;
using Microsoft.Data.Sqlite;
using Verdict.Core.Data;

namespace Verdict.Core.Backup;

// Export/import zálohy přes databázi. Port z src/main/backup/export.ts + import.ts.
// Obnova je NEDESTRUKTIVNÍ: závody se vždy vloží jako NOVÉ (přemapování id),
// existující data se nemažou.

public sealed class BackupService
{
    static BackupService() => DefaultTypeMap.MatchNamesWithUnderscores = true;

    private readonly DbContext _db;

    public BackupService(DbContext db) => _db = db;

    private SqliteConnection Conn => _db.Connection;

    // ── Obálka (meta) ─────────────────────────────────────────────────────────

    private static string AppVersion() =>
        Assembly.GetEntryAssembly()
            ?.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion
        ?? Assembly.GetEntryAssembly()?.GetName().Version?.ToString()
        ?? "0.0.0";

    private int SchemaVersion()
    {
        long v = Conn.ExecuteScalar<long>("PRAGMA user_version");
        return v > 0 ? (int)v : Migrations.SchemaVersion;
    }

    /// <summary>Aktuální verze schématu DB — pro validaci načítané zálohy.</summary>
    public int AktualniSchemaVersion() => SchemaVersion();

    private BackupFile NovaObalka(string scope) => new()
    {
        Format        = BackupFormaty.Verdict,
        FormatVersion = BackupFormaty.Verze,
        AppVersion    = AppVersion(),
        SchemaVersion = SchemaVersion(),
        ExportedAt    = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'"),
        Scope         = scope,
    };

    // ── Export ────────────────────────────────────────────────────────────────

    /// <summary>Záloha jednoho závodu (scope=zavod).</summary>
    public BackupFile ExportZavod(int zavodId)
    {
        var obal = NovaObalka("zavod");
        obal.Zavody = [ExportZavodPayload(zavodId)];
        return obal;
    }

    /// <summary>Záloha celé databáze (scope=database) — všechny závody + globální tabulky.</summary>
    public BackupFile ExportDatabaze()
    {
        var obal = NovaObalka("database");
        var ids = Conn.Query<int>("SELECT id FROM zavod ORDER BY id").ToList();
        obal.Zavody = ids.Select(ExportZavodPayload).ToList();
        obal.Zebricek  = Conn.Query<BackupZebricekRow>(
            "SELECT id, ruleset, poradi, body FROM zebricek ORDER BY ruleset, poradi").ToList();
        obal.Pravidla  = Conn.Query<BackupPravidlaRow>(
            """
            SELECT id, ruleset, max_na_jizdu, sf_prah, sf_max, dnf_offset, dns_offset, dq_offset,
                   dnf_body, dns_body, dq_body
            FROM pravidla ORDER BY ruleset
            """).ToList();
        obal.Nastaveni = Conn.Query<BackupNastaveniRow>(
            "SELECT klic, hodnota FROM nastaveni ORDER BY klic").ToList();
        return obal;
    }

    private BackupZavodPayload ExportZavodPayload(int zavodId)
    {
        var zavod = Conn.QueryFirstOrDefault<BackupZavodRow>(
            "SELECT id, nazev, datum, misto, typ FROM zavod WHERE id = @Id", new { Id = zavodId })
            ?? throw new BackupValidationException("Závod nenalezen.");

        var payload = new BackupZavodPayload { Zavod = zavod };

        var kategorie = Conn.Query<BackupKategorieRow>(
            "SELECT id, zavod_id, nazev, ruleset, finale_velikost FROM kategorie WHERE zavod_id = @Id ORDER BY id",
            new { Id = zavodId }).ToList();
        payload.Kategorie = kategorie;

        var katIds = kategorie.Select(k => k.Id).ToList();
        if (katIds.Count == 0) return payload;

        payload.Skupiny = Conn.Query<BackupSkupinaRow>(
            "SELECT id, kategorie_id, nazev FROM skupina WHERE kategorie_id IN @Kat",
            new { Kat = katIds }).ToList();

        payload.Jezdci = Conn.Query<BackupJezdecRow>(
            """
            SELECT id, kategorie_id, st_cislo, prijmeni, jmeno, znacka, model, rok_narozeni, los
            FROM jezdec WHERE kategorie_id IN @Kat ORDER BY id
            """, new { Kat = katIds }).ToList();

        var kola = Conn.Query<BackupKoloRow>(
            "SELECT id, kategorie_id, typ, poradi FROM kolo WHERE kategorie_id IN @Kat ORDER BY id",
            new { Kat = katIds }).ToList();
        payload.Kola = kola;

        var koloIds = kola.Select(k => k.Id).ToList();
        if (koloIds.Count == 0) return payload;

        var jizdy = Conn.Query<BackupJizdaRow>(
            "SELECT id, kolo_id, cislo, skupina_id FROM jizda WHERE kolo_id IN @Kola ORDER BY id",
            new { Kola = koloIds }).ToList();
        payload.Jizdy = jizdy;

        var jizdaIds = jizdy.Select(j => j.Id).ToList();
        if (jizdaIds.Count == 0) return payload;

        payload.RostPozice = Conn.Query<BackupRostPoziceRow>(
            "SELECT id, jizda_id, pozice, jezdec_id FROM rost_pozice WHERE jizda_id IN @J ORDER BY id",
            new { J = jizdaIds }).ToList();

        var vysledky = Conn.Query<BackupVysledekRow>(
            """
            SELECT id, jizda_id, jezdec_id, namereny_cas_ms, penalizace_ms, stav, rucni_poradi,
                   poradi, body, body_rucni, poznamka
            FROM vysledek WHERE jizda_id IN @J ORDER BY id
            """, new { J = jizdaIds }).ToList();
        payload.Vysledky = vysledky;

        payload.Mereni = Conn.Query<BackupMereniRow>(
            "SELECT id, jizda_id, zavod_id, poradi_kliku, cas_ms, jezdec_id FROM mereni WHERE jizda_id IN @J ORDER BY id",
            new { J = jizdaIds }).ToList();

        var vysIds = vysledky.Select(v => v.Id).ToList();
        if (vysIds.Count > 0)
        {
            payload.UpravaLog = Conn.Query<BackupUpravaLogRow>(
                """
                SELECT id, vysledek_id, typ, hodnota, duvod, rozhodl, kdy
                FROM uprava_log WHERE vysledek_id IN @V ORDER BY id
                """, new { V = vysIds }).ToList();
        }

        return payload;
    }

    // ── Import / obnova ─────────────────────────────────────────────────────────

    /// <summary>Načte a ověří JSON; pak vloží všechny závody jako nové.</summary>
    public BackupRestoreResult ObnovZTextu(string json)
    {
        var data = BackupSerializer.Parse(json, SchemaVersion());

        using var tx = Conn.BeginTransaction();
        try
        {
            var ids = new List<int>();
            foreach (var blok in data.Zavody)
                ids.Add(VlozZavodBlok(blok, tx));

            if (data.Scope == "database")
                ImportGlobalniTabulky(data, tx);

            tx.Commit();
            string nazev = data.Zavody[^1].Zavod.Nazev;
            return new BackupRestoreResult(ids, nazev);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    private int VlozZavodBlok(BackupZavodPayload blok, SqliteTransaction tx)
    {
        var z = blok.Zavod;
        Conn.Execute("INSERT INTO zavod (nazev, datum, misto, typ) VALUES (@Nazev, @Datum, @Misto, @Typ)",
            new { z.Nazev, z.Datum, z.Misto, z.Typ }, tx);
        int novyZavodId = (int)Conn.ExecuteScalar<long>("SELECT last_insert_rowid()", null, tx);

        var katMap = new Dictionary<int, int>();
        foreach (var k in blok.Kategorie)
        {
            Conn.Execute(
                "INSERT INTO kategorie (zavod_id, nazev, ruleset, finale_velikost) VALUES (@Z, @N, @R, @F)",
                new { Z = novyZavodId, N = k.Nazev, R = k.Ruleset, F = k.FinaleVelikost }, tx);
            katMap[k.Id] = (int)Conn.ExecuteScalar<long>("SELECT last_insert_rowid()", null, tx);
        }

        var skupMap = new Dictionary<int, int>();
        foreach (var s in blok.Skupiny)
        {
            if (!katMap.TryGetValue(s.KategorieId, out int kid)) continue;
            Conn.Execute("INSERT INTO skupina (kategorie_id, nazev) VALUES (@K, @N)",
                new { K = kid, s.Nazev }, tx);
            skupMap[s.Id] = (int)Conn.ExecuteScalar<long>("SELECT last_insert_rowid()", null, tx);
        }

        var jezMap = new Dictionary<int, int>();
        foreach (var j in blok.Jezdci)
        {
            if (!katMap.TryGetValue(j.KategorieId, out int kid)) continue;
            Conn.Execute(
                """
                INSERT INTO jezdec (kategorie_id, st_cislo, prijmeni, jmeno, znacka, model, rok_narozeni, los)
                VALUES (@K, @St, @P, @Jm, @Zn, @M, @Rok, @Los)
                """,
                new { K = kid, St = j.StCislo, P = j.Prijmeni, Jm = j.Jmeno, Zn = j.Znacka,
                      M = j.Model, Rok = j.RokNarozeni, j.Los }, tx);
            jezMap[j.Id] = (int)Conn.ExecuteScalar<long>("SELECT last_insert_rowid()", null, tx);
        }

        var koloMap = new Dictionary<int, int>();
        foreach (var k in blok.Kola)
        {
            if (!katMap.TryGetValue(k.KategorieId, out int kid)) continue;
            Conn.Execute("INSERT INTO kolo (kategorie_id, typ, poradi) VALUES (@K, @T, @P)",
                new { K = kid, T = k.Typ, P = k.Poradi }, tx);
            koloMap[k.Id] = (int)Conn.ExecuteScalar<long>("SELECT last_insert_rowid()", null, tx);
        }

        var jizdaMap = new Dictionary<int, int>();
        foreach (var j in blok.Jizdy)
        {
            if (!koloMap.TryGetValue(j.KoloId, out int kolid)) continue;
            int? skupinaId = j.SkupinaId is { } sid && skupMap.TryGetValue(sid, out int ns) ? ns : null;
            Conn.Execute("INSERT INTO jizda (kolo_id, cislo, skupina_id) VALUES (@K, @C, @S)",
                new { K = kolid, C = j.Cislo, S = skupinaId }, tx);
            jizdaMap[j.Id] = (int)Conn.ExecuteScalar<long>("SELECT last_insert_rowid()", null, tx);
        }

        foreach (var r in blok.RostPozice)
        {
            if (!jizdaMap.TryGetValue(r.JizdaId, out int jid)) continue;
            if (!jezMap.TryGetValue(r.JezdecId, out int jeid)) continue;
            Conn.Execute("INSERT INTO rost_pozice (jizda_id, pozice, jezdec_id) VALUES (@J, @P, @Je)",
                new { J = jid, r.Pozice, Je = jeid }, tx);
        }

        var vysMap = new Dictionary<int, int>();
        foreach (var v in blok.Vysledky)
        {
            if (!jizdaMap.TryGetValue(v.JizdaId, out int jid)) continue;
            if (!jezMap.TryGetValue(v.JezdecId, out int jeid)) continue;
            Conn.Execute(
                """
                INSERT INTO vysledek (jizda_id, jezdec_id, namereny_cas_ms, penalizace_ms, stav,
                    rucni_poradi, poradi, body, body_rucni, poznamka)
                VALUES (@J, @Je, @Cas, @Pen, @Stav, @Rucni, @Por, @Body, @BodyRucni, @Pozn)
                """,
                new { J = jid, Je = jeid, Cas = v.NamerenyCasMs, Pen = v.PenalizaceMs, v.Stav,
                      Rucni = v.RucniPoradi, Por = v.Poradi, v.Body, BodyRucni = v.BodyRucni,
                      Pozn = v.Poznamka }, tx);
            vysMap[v.Id] = (int)Conn.ExecuteScalar<long>("SELECT last_insert_rowid()", null, tx);
        }

        foreach (var m in blok.Mereni)
        {
            if (!jizdaMap.TryGetValue(m.JizdaId, out int jid)) continue;
            int? jeid = m.JezdecId is { } mj && jezMap.TryGetValue(mj, out int nj) ? nj : null;
            Conn.Execute(
                "INSERT INTO mereni (jizda_id, zavod_id, poradi_kliku, cas_ms, jezdec_id) VALUES (@J, @Z, @P, @C, @Je)",
                new { J = jid, Z = novyZavodId, P = m.PoradiKliku, C = m.CasMs, Je = jeid }, tx);
        }

        foreach (var u in blok.UpravaLog)
        {
            if (!vysMap.TryGetValue(u.VysledekId, out int vid)) continue;
            Conn.Execute(
                "INSERT INTO uprava_log (vysledek_id, typ, hodnota, duvod, rozhodl, kdy) VALUES (@V, @T, @H, @D, @R, @K)",
                new { V = vid, T = u.Typ, H = u.Hodnota, D = u.Duvod, R = u.Rozhodl, K = u.Kdy }, tx);
        }

        return novyZavodId;
    }

    private void ImportGlobalniTabulky(BackupFile data, SqliteTransaction tx)
    {
        if (data.Zebricek is { Count: > 0 } zeb)
        {
            Conn.Execute("DELETE FROM zebricek", null, tx);
            foreach (var z in zeb)
                Conn.Execute("INSERT INTO zebricek (ruleset, poradi, body) VALUES (@R, @P, @B)",
                    new { R = z.Ruleset, P = z.Poradi, B = z.Body }, tx);
        }

        if (data.Pravidla is { Count: > 0 } prav)
        {
            foreach (var p in prav)
                Conn.Execute(
                    """
                    UPDATE pravidla SET max_na_jizdu=@Max, sf_prah=@Prah, sf_max=@SfMax,
                        dnf_offset=@DnfO, dns_offset=@DnsO, dq_offset=@DqO,
                        dnf_body=@DnfB, dns_body=@DnsB, dq_body=@DqB
                    WHERE ruleset=@R
                    """,
                    new { Max = p.MaxNaJizdu, Prah = p.SfPrah, SfMax = p.SfMax,
                          DnfO = p.DnfOffset, DnsO = p.DnsOffset, DqO = p.DqOffset,
                          DnfB = p.DnfBody, DnsB = p.DnsBody, DqB = p.DqBody, R = p.Ruleset }, tx);
        }

        if (data.Nastaveni is { Count: > 0 } nast)
        {
            foreach (var n in nast)
            {
                if (n.Klic == "aktivni_zavod") continue;
                Conn.Execute(
                    "INSERT INTO nastaveni (klic, hodnota) VALUES (@K, @H) " +
                    "ON CONFLICT(klic) DO UPDATE SET hodnota = excluded.hodnota",
                    new { K = n.Klic, H = n.Hodnota }, tx);
            }
        }
    }
}
