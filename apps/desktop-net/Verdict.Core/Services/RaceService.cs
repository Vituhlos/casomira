using Dapper;
using Verdict.Core.Data;
using Verdict.Core.Model;
using Verdict.Core.Scoring;

namespace Verdict.Core.Services;

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

    private sealed record JezdecRow(
        int Id, int KategorieId, int? StCislo,
        string Prijmeni, string Jmeno, string Znacka, string Model,
        int? RokNarozeni, int? Los);

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

    // ── Jezdci ────────────────────────────────────────────────────────────────

    public IReadOnlyList<Jezdec> GetJezdci(int kategorieId)
    {
        const string sql = """
            SELECT id,
                   kategorie_id AS KategorieId,
                   st_cislo     AS StCislo,
                   prijmeni, jmeno, znacka, model,
                   rok_narozeni AS RokNarozeni,
                   los
            FROM jezdec
            WHERE kategorie_id = @KategorieId
            ORDER BY CASE WHEN los IS NULL THEN 1 ELSE 0 END, los,
                     CASE WHEN st_cislo IS NULL THEN 1 ELSE 0 END, st_cislo,
                     prijmeni
            """;
        return _db.Connection
            .Query<JezdecRow>(sql, new { KategorieId = kategorieId })
            .Select(r => new Jezdec(r.Id, r.KategorieId, r.StCislo,
                r.Prijmeni, r.Jmeno, r.Znacka, r.Model, r.RokNarozeni, r.Los))
            .ToList();
    }

    public int VytvorJezdce(int kategorieId, ParsedJezdec vstup)
    {
        _db.Connection.Execute(
            """
            INSERT INTO jezdec (kategorie_id, st_cislo, prijmeni, jmeno, znacka, model, rok_narozeni, los)
            VALUES (@K, @S, @P, @J, @Z, @M, @R, @L)
            """,
            new { K = kategorieId, S = vstup.StCislo, P = vstup.Prijmeni,
                  J = vstup.Jmeno, Z = vstup.Znacka, M = vstup.Model,
                  R = vstup.RokNarozeni, L = vstup.Los });
        return (int)_db.Connection.ExecuteScalar<long>("SELECT last_insert_rowid()");
    }

    public void AktualizujJezdce(JezdecUprava uprava)
    {
        string col = uprava.Pole switch
        {
            JezdecPole.StCislo  => "st_cislo",
            JezdecPole.Prijmeni => "prijmeni",
            JezdecPole.Jmeno    => "jmeno",
            JezdecPole.Znacka   => "znacka",
            JezdecPole.Model    => "model",
            JezdecPole.Los      => "los",
            _ => throw new ArgumentOutOfRangeException(nameof(uprava))
        };
        _db.Connection.Execute(
            $"UPDATE jezdec SET {col} = @H WHERE id = @Id",
            new { H = uprava.Hodnota, Id = uprava.Id });
    }

    public void SmazJezdce(int id)
    {
        _db.Connection.Execute("DELETE FROM jezdec WHERE id = @Id", new { Id = id });
    }

    // ── Kola + jizdy ──────────────────────────────────────────────────────────

    public Kolo? GetKolo(int kategorieId, KoloTyp typ)
    {
        var row = _db.Connection.QueryFirstOrDefault<(int Id, int KategorieId, string Typ, int Poradi)>(
            "SELECT id, kategorie_id, typ, poradi FROM kolo WHERE kategorie_id = @K AND typ = @T",
            new { K = kategorieId, T = typ.ToString() });
        return row.Id == 0 ? null : new Kolo(row.Id, row.KategorieId, typ, row.Poradi);
    }

    public int EnsureKolo(int kategorieId, KoloTyp typ)
    {
        var existing = GetKolo(kategorieId, typ);
        if (existing is not null) return existing.Id;

        int poradi = _db.Connection.ExecuteScalar<int>(
            "SELECT COALESCE(MAX(poradi), 0) + 1 FROM kolo WHERE kategorie_id = @K",
            new { K = kategorieId });

        _db.Connection.Execute(
            "INSERT INTO kolo (kategorie_id, typ, poradi) VALUES (@K, @T, @P)",
            new { K = kategorieId, T = typ.ToString(), P = poradi });

        return (int)_db.Connection.ExecuteScalar<long>("SELECT last_insert_rowid()");
    }

    public int VytvorJizdu(int koloId)
    {
        int cislo = _db.Connection.ExecuteScalar<int>(
            "SELECT COALESCE(MAX(cislo), 0) + 1 FROM jizda WHERE kolo_id = @K",
            new { K = koloId });

        _db.Connection.Execute(
            "INSERT INTO jizda (kolo_id, cislo) VALUES (@K, @C)",
            new { K = koloId, C = cislo });

        return (int)_db.Connection.ExecuteScalar<long>("SELECT last_insert_rowid()");
    }

    public void SmazJizdu(int jizdaId)
    {
        _db.Connection.Execute("DELETE FROM jizda WHERE id = @Id", new { Id = jizdaId });
    }

    // ── Rošty ─────────────────────────────────────────────────────────────────

    public RostKolo GetRost(int koloId)
    {
        var jizdy = _db.Connection
            .Query<(int Id, int Cislo)>(
                "SELECT id, cislo FROM jizda WHERE kolo_id = @K ORDER BY cislo",
                new { K = koloId })
            .ToList();

        if (jizdy.Count == 0) return new RostKolo(koloId, []);

        const string slotSql = """
            SELECT rp.jizda_id AS JizdaId, rp.pozice AS Pozice,
                   j.id AS JezdecId, j.kategorie_id AS KategorieId,
                   j.st_cislo AS StCislo, j.prijmeni AS Prijmeni, j.jmeno AS Jmeno,
                   j.znacka AS Znacka, j.model AS Model,
                   j.rok_narozeni AS RokNarozeni, j.los AS Los
            FROM rost_pozice rp
            JOIN jezdec j ON j.id = rp.jezdec_id
            WHERE rp.jizda_id IN (SELECT id FROM jizda WHERE kolo_id = @K)
            ORDER BY rp.jizda_id, rp.pozice
            """;

        var slots = _db.Connection.Query<RostPoziceRow>(slotSql, new { K = koloId }).ToList();
        var slotsByJizda = slots
            .GroupBy(s => s.JizdaId)
            .ToDictionary(g => g.Key, g => g.ToDictionary(s => s.Pozice));

        const int maxPozici = 8;

        var result = jizdy.Select(ji =>
        {
            var filled = slotsByJizda.TryGetValue(ji.Id, out var d) ? d : [];
            var sloty = Enumerable.Range(1, maxPozici)
                .Select(p =>
                {
                    if (!filled.TryGetValue(p, out var s)) return new RostSlot(p, null);
                    return new RostSlot(p, new Jezdec(
                        s.JezdecId, s.KategorieId, s.StCislo,
                        s.Prijmeni, s.Jmeno, s.Znacka, s.Model,
                        s.RokNarozeni, s.Los));
                })
                .ToList();
            return new RostJizda(ji.Id, ji.Cislo, sloty);
        }).ToList();

        return new RostKolo(koloId, result);
    }

    public SetRostResult SetRostPozice(int jizdaId, int pozice, int? stCislo)
    {
        if (stCislo is null)
        {
            _db.Connection.Execute(
                "DELETE FROM rost_pozice WHERE jizda_id = @J AND pozice = @P",
                new { J = jizdaId, P = pozice });
            return new SetRostResult(true, null);
        }

        var jezdecRow = _db.Connection.QueryFirstOrDefault<JezdecRow>("""
            SELECT j.id, j.kategorie_id AS KategorieId, j.st_cislo AS StCislo,
                   j.prijmeni, j.jmeno, j.znacka, j.model,
                   j.rok_narozeni AS RokNarozeni, j.los
            FROM jezdec j
            JOIN kategorie k  ON k.id  = j.kategorie_id
            JOIN kolo ko      ON ko.kategorie_id = k.id
            JOIN jizda ji     ON ji.kolo_id = ko.id
            WHERE ji.id = @J AND j.st_cislo = @S
            """, new { J = jizdaId, S = stCislo });

        if (jezdecRow is null) return new SetRostResult(false, null);

        var jezdec = new Jezdec(jezdecRow.Id, jezdecRow.KategorieId, jezdecRow.StCislo,
            jezdecRow.Prijmeni, jezdecRow.Jmeno, jezdecRow.Znacka, jezdecRow.Model,
            jezdecRow.RokNarozeni, jezdecRow.Los);

        // Kontrola: je jezdec v téže jízdě na jiné pozici?
        var existingPozice = _db.Connection.QueryFirstOrDefault<int?>(
            "SELECT pozice FROM rost_pozice WHERE jizda_id = @J AND jezdec_id = @Id",
            new { J = jizdaId, Id = jezdec.Id });

        if (existingPozice.HasValue && existingPozice.Value != pozice)
            return new SetRostResult(false, jezdec, Duplicitni: true);

        _db.Connection.Execute(
            "DELETE FROM rost_pozice WHERE jizda_id = @J AND pozice = @P",
            new { J = jizdaId, P = pozice });
        _db.Connection.Execute(
            "INSERT INTO rost_pozice (jizda_id, pozice, jezdec_id) VALUES (@J, @P, @Id)",
            new { J = jizdaId, P = pozice, Id = jezdec.Id });

        return new SetRostResult(true, jezdec);
    }

    public void SmazRostPozice(int jizdaId, int pozice)
    {
        _db.Connection.Execute(
            "DELETE FROM rost_pozice WHERE jizda_id = @J AND pozice = @P",
            new { J = jizdaId, P = pozice });
    }

    // ── Výsledky ──────────────────────────────────────────────────────────────

    public VysledekKolo GetVysledky(int koloId)
    {
        var jizdy = _db.Connection
            .Query<(int Id, int Cislo)>(
                "SELECT id, cislo FROM jizda WHERE kolo_id = @K ORDER BY cislo",
                new { K = koloId })
            .ToList();

        if (jizdy.Count == 0) return new VysledekKolo(koloId, []);

        const string sql = """
            SELECT v.id AS VysledekId, v.jizda_id AS JizdaId, v.jezdec_id AS JezdecId,
                   j.st_cislo AS StCislo, j.prijmeni AS Prijmeni, j.jmeno AS Jmeno,
                   j.znacka AS Znacka, j.model AS Model,
                   v.namereny_cas_ms AS MerCasMs, v.penalizace_ms AS PenalizaceMs,
                   v.stav AS Stav, v.poradi AS Poradi, v.body AS Body,
                   v.body_rucni AS BodyRucni, v.rucni_poradi AS RucniPoradi
            FROM vysledek v
            JOIN jezdec j ON j.id = v.jezdec_id
            WHERE v.jizda_id IN (SELECT id FROM jizda WHERE kolo_id = @K)
            ORDER BY v.jizda_id, COALESCE(v.poradi, 9999), j.st_cislo
            """;

        var rows = _db.Connection.Query<VysledekRowDb>(sql, new { K = koloId }).ToList();
        var byJizda = rows.GroupBy(r => r.JizdaId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = jizdy.Select(ji =>
        {
            var radky = byJizda.TryGetValue(ji.Id, out var rr) ? rr : [];
            var vysledky = radky.Select(r => new VysledekRadek(
                r.VysledekId, r.JezdecId, r.StCislo, r.Prijmeni, r.Jmeno,
                r.Znacka, r.Model, r.MerCasMs, r.PenalizaceMs,
                Enum.Parse<Stav>(r.Stav), r.Poradi, r.Body,
                r.BodyRucni, r.RucniPoradi,
                null, null, null, null)).ToList();
            return new VysledekJizda(ji.Id, ji.Cislo, vysledky);
        }).ToList();

        return new VysledekKolo(koloId, result);
    }

    public void InicializujVysledky(int koloId)
    {
        _db.Connection.Execute("""
            INSERT OR IGNORE INTO vysledek (jizda_id, jezdec_id)
            SELECT rp.jizda_id, rp.jezdec_id
            FROM rost_pozice rp
            JOIN jizda ji ON ji.id = rp.jizda_id
            WHERE ji.kolo_id = @K
            """, new { K = koloId });
    }

    public void NastavVysledek(SetVysledekArg arg)
    {
        if (arg.CasMs.HasValue)
            _db.Connection.Execute(
                "UPDATE vysledek SET namereny_cas_ms = @Cas WHERE jizda_id = @J AND jezdec_id = @Jezdec",
                new { Cas = arg.CasMs, J = arg.JizdaId, Jezdec = arg.JezdecId });

        if (arg.Stav.HasValue)
            _db.Connection.Execute(
                "UPDATE vysledek SET stav = @Stav WHERE jizda_id = @J AND jezdec_id = @Jezdec",
                new { Stav = arg.Stav.Value.ToString(), J = arg.JizdaId, Jezdec = arg.JezdecId });
    }

    public void PrepocitejPoradi(int jizdaId)
    {
        const string rowSql = """
            SELECT v.jezdec_id AS JezdecId, v.namereny_cas_ms AS CasMs,
                   v.penalizace_ms AS PenalizaceMs, v.stav AS Stav,
                   v.rucni_poradi AS RucniPoradi
            FROM vysledek v WHERE v.jizda_id = @J
            """;
        var rows = _db.Connection
            .Query<VysledekPrepocitejRow>(rowSql, new { J = jizdaId })
            .ToList();

        if (rows.Count == 0) return;

        var ruleset = _db.Connection.ExecuteScalar<string>("""
            SELECT k.ruleset FROM kategorie k
            JOIN kolo ko ON ko.kategorie_id = k.id
            JOIN jizda ji ON ji.kolo_id = ko.id
            WHERE ji.id = @J
            """, new { J = jizdaId }) ?? "STANDARD";

        var zebricek = _db.Connection
            .Query<(int Poradi, int Body)>(
                "SELECT poradi, body FROM zebricek WHERE ruleset = @R ORDER BY poradi",
                new { R = ruleset })
            .ToList();

        int bodyZaPozici(int p)
        {
            if (zebricek.Count == 0) return Math.Max(0, 50 - (p - 1));
            var found = zebricek.FirstOrDefault(z => z.Poradi == p);
            if (found != default) return found.Body;
            // Extrapolace za konec tabulky
            var last = zebricek[^1];
            return Math.Max(0, last.Body - (p - last.Poradi));
        }

        var prav = _db.Connection.QueryFirstOrDefault<(int? Dnf, int? Dns, int? Dq)>(
            "SELECT dnf_offset AS Dnf, dns_offset AS Dns, dq_offset AS Dq FROM pravidla WHERE ruleset = @R",
            new { R = ruleset });
        var penalizace = new Penalizace(prav.Dnf ?? -1, prav.Dns ?? -5, prav.Dq ?? -10, null, null, null);

        // Penalizace_ms je přičtena k času před předáním enginu (engine řadí jen dle CasMs).
        var vstupy = rows.Select(r =>
        {
            int? efektivniCas = r.CasMs.HasValue ? r.CasMs.Value + r.PenalizaceMs : null;
            return new JizdaVstup(r.JezdecId, efektivniCas, Enum.Parse<Stav>(r.Stav));
        }).ToList();

        var vysledky = ScoringEngine.SpocitejJizdu(vstupy, bodyZaPozici, penalizace);

        using var tx = _db.Connection.BeginTransaction();
        try
        {
            foreach (var v in vysledky)
            {
                _db.Connection.Execute("""
                    UPDATE vysledek SET poradi = @Poradi, body = @Body
                    WHERE jizda_id = @J AND jezdec_id = @JezdecId
                    """, new { J = jizdaId, Poradi = v.Poradi, Body = v.Body, JezdecId = v.JezdecId }, tx);
            }
            tx.Commit();
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    // ── Klasifikace ───────────────────────────────────────────────────────────

    // Součet bodů přes jízdy uvedených kol; tiebreak dle lepšího kola (Q3→Q2→Q1).
    // Bere jen jezdce s losem (skuteční účastníci). CLAUDE.md §7.
    public IReadOnlyList<KlasifikaceRadek> GetKlasifikace(int kategorieId, IReadOnlyList<KoloTyp> koloTypy)
    {
        if (koloTypy.Count == 0) return [];

        var typy = koloTypy.Select(t => t.ToString()).ToArray();

        const string sql = """
            SELECT v.jezdec_id AS JezdecId, k.typ AS Typ, v.body AS Body
            FROM vysledek v
            JOIN jizda jz  ON jz.id = v.jizda_id
            JOIN kolo k    ON k.id  = jz.kolo_id
            JOIN jezdec j  ON j.id  = v.jezdec_id
            WHERE k.kategorie_id = @K AND k.typ IN @Typy AND j.los IS NOT NULL
            """;

        var rows = _db.Connection
            .Query<(int JezdecId, string Typ, int? Body)>(sql, new { K = kategorieId, Typy = typy })
            .ToList();

        var agg = new Dictionary<int, (Dictionary<string, int> PerKolo, int Celkem)>();
        foreach (var r in rows)
        {
            if (!agg.TryGetValue(r.JezdecId, out var e))
            {
                e = (new Dictionary<string, int>(), 0);
            }
            int b = r.Body ?? 0;
            e.PerKolo[r.Typ] = (e.PerKolo.TryGetValue(r.Typ, out int prev) ? prev : 0) + b;
            e.Celkem += b;
            agg[r.JezdecId] = e;
        }

        if (agg.Count == 0) return [];

        var ids = agg.Keys.ToArray();
        var jezdci = _db.Connection
            .Query<JezdecRow>("""
                SELECT id, kategorie_id AS KategorieId, st_cislo AS StCislo,
                       prijmeni, jmeno, znacka, model,
                       rok_narozeni AS RokNarozeni, los
                FROM jezdec WHERE id IN @Ids
                """, new { Ids = ids })
            .ToDictionary(j => j.Id);

        var list = agg.Select(kv =>
        {
            var j = jezdci.GetValueOrDefault(kv.Key);
            return new
            {
                JezdecId = kv.Key,
                StCislo  = j?.StCislo,
                Prijmeni = j?.Prijmeni ?? "",
                Jmeno    = j?.Jmeno ?? "",
                Los      = j?.Los,
                kv.Value.PerKolo,
                kv.Value.Celkem
            };
        }).ToList();

        list.Sort((a, b) =>
        {
            if (a.Celkem != b.Celkem) return b.Celkem - a.Celkem;
            return ScoringEngine.TiebreakPerKolo(a.PerKolo, b.PerKolo, typy);
        });

        return list.Select((r, i) => new KlasifikaceRadek(
            i + 1, r.JezdecId, r.StCislo, r.Prijmeni, r.Jmeno, r.Los,
            r.PerKolo, r.Celkem)).ToList();
    }

    // ── Závěr závodu (SF / Finále / Celkově) ──────────────────────────────────

    // Kvalifikovaní jezdci seřazení dle Klasifikace po Q3 (nejlepší první).
    private List<int> KvalifikovaniPoradi(int kategorieId)
    {
        const string sql = """
            SELECT v.jezdec_id AS JezdecId,
                   SUM(CASE WHEN v.stav = 'OK' AND v.namereny_cas_ms IS NOT NULL THEN 1 ELSE 0 END) AS Dokoncil,
                   SUM(CASE WHEN v.stav IN ('OK','DNF') THEN 1 ELSE 0 END) AS Odstartoval
            FROM vysledek v
            JOIN jizda jz ON jz.id = v.jizda_id
            JOIN kolo k   ON k.id  = jz.kolo_id
            WHERE k.kategorie_id = @K AND k.typ IN ('Q1','Q2','Q3')
            GROUP BY v.jezdec_id
            """;
        var stats = _db.Connection
            .Query<(int JezdecId, int Dokoncil, int Odstartoval)>(sql, new { K = kategorieId })
            .ToList();

        var kval = stats
            .Where(s => ZaverEngine.JeKvalifikovan(s.Dokoncil, s.Odstartoval))
            .Select(s => s.JezdecId)
            .ToHashSet();

        return GetKlasifikace(kategorieId, [KoloTyp.Q1, KoloTyp.Q2, KoloTyp.Q3])
            .Where(r => kval.Contains(r.JezdecId))
            .Select(r => r.JezdecId)
            .ToList();
    }

    private bool MaJizdy(int kategorieId, KoloTyp typ)
    {
        var kolo = GetKolo(kategorieId, typ);
        if (kolo is null) return false;
        return _db.Connection.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM jizda WHERE kolo_id = @K", new { K = kolo.Id }) > 0;
    }

    private bool RostObsazen(int kategorieId, KoloTyp typ)
    {
        var kolo = GetKolo(kategorieId, typ);
        if (kolo is null) return false;
        return _db.Connection.ExecuteScalar<int>("""
            SELECT COUNT(*) FROM rost_pozice rp
            JOIN jizda jz ON jz.id = rp.jizda_id
            WHERE jz.kolo_id = @K
            """, new { K = kolo.Id }) > 0;
    }

    private Jezdec? NajdiJezdce(int id)
    {
        var r = _db.Connection.QueryFirstOrDefault<JezdecRow>("""
            SELECT id, kategorie_id AS KategorieId, st_cislo AS StCislo,
                   prijmeni, jmeno, znacka, model,
                   rok_narozeni AS RokNarozeni, los
            FROM jezdec WHERE id = @Id
            """, new { Id = id });
        return r is null ? null : new Jezdec(r.Id, r.KategorieId, r.StCislo,
            r.Prijmeni, r.Jmeno, r.Znacka, r.Model, r.RokNarozeni, r.Los);
    }

    public ZaverStav GetZaverStav(int kategorieId)
    {
        var kval = KvalifikovaniPoradi(kategorieId);
        int finaleVelikost = _db.Connection.ExecuteScalar<int>(
            "SELECT finale_velikost FROM kategorie WHERE id = @K", new { K = kategorieId });

        return new ZaverStav(
            Kvalifikovani: kval.Count,
            PrahSF: ZaverEngine.PrahSF,
            SfSeKona: kval.Count >= ZaverEngine.PrahSF,
            SfHotovo: MaJizdy(kategorieId, KoloTyp.SF),
            FinaleHotovo: MaJizdy(kategorieId, KoloTyp.F),
            FinaleVelikost: finaleVelikost);
    }

    public RostNavrh NavrhSF(int kategorieId)
    {
        var kval = KvalifikovaniPoradi(kategorieId);
        bool obsazeno = RostObsazen(kategorieId, KoloTyp.SF);

        if (kval.Count < ZaverEngine.PrahSF)
            return new RostNavrh(false,
                $"Semifinále se nekoná — jen {kval.Count} kvalifikovaných (potřeba {ZaverEngine.PrahSF}). Jeď rovnou finále.",
                obsazeno, [], 0, 0, 0);

        var (heat1, heat2) = ZaverEngine.NasazSF(kval);

        List<Jezdec> ToJezdci(IEnumerable<int> ids) =>
            ids.Select(NajdiJezdce).Where(j => j is not null).Select(j => j!).ToList();

        return new RostNavrh(true, null, obsazeno,
            [new RostNavrhJizda(1, ToJezdci(heat1)), new RostNavrhJizda(2, ToJezdci(heat2))],
            2, 2, 2);
    }

    public RostNavrh NavrhFinale(int kategorieId)
    {
        var stav = GetZaverStav(kategorieId);
        int n = stav.FinaleVelikost;
        bool obsazeno = RostObsazen(kategorieId, KoloTyp.F);
        const int maxNahradnici = 5;

        RostNavrh Chyba(string msg) => new(false, msg, obsazeno, [], 0, 0, 0);

        RostNavrh Jizda(IReadOnlyList<int> ids, IReadOnlyList<int> nahradniciIds)
        {
            var vsichni = ids.Concat(nahradniciIds.Take(maxNahradnici))
                .Select(NajdiJezdce).Where(j => j is not null).Select(j => j!).ToList();
            return new RostNavrh(true, null, obsazeno,
                [new RostNavrhJizda(1, vsichni)], 1, 1, 1, n);
        }

        if (stav.SfSeKona)
        {
            if (!stav.SfHotovo) return Chyba("Nejdřív vygeneruj semifinále (záložka Semifinále).");

            var sfKolo = GetKolo(kategorieId, KoloTyp.SF)!;
            var sfJizdy = _db.Connection
                .Query<(int Id, int Cislo)>(
                    "SELECT id, cislo FROM jizda WHERE kolo_id = @K ORDER BY cislo", new { K = sfKolo.Id })
                .ToList();

            List<(int JezdecId, int? Poradi)> PoradiJizdy(int jizdaId) =>
                _db.Connection.Query<(int JezdecId, int? Poradi)>(
                    "SELECT jezdec_id, poradi FROM vysledek WHERE jizda_id = @J ORDER BY (poradi IS NULL), poradi",
                    new { J = jizdaId }).ToList();

            var h1 = sfJizdy.Count > 0 ? PoradiJizdy(sfJizdy[0].Id) : [];
            var h2 = sfJizdy.Count > 1 ? PoradiJizdy(sfJizdy[1].Id) : [];

            if (!h1.Concat(h2).Any(r => r.Poradi is not null))
                return Chyba("Nejdřív zadej výsledky semifinále.");

            int naJizdu = n / 2;  // 8 → 4, 10 → 5
            var postup1 = h1.Take(naJizdu).Select(r => r.JezdecId).ToList();
            var postup2 = h2.Take(naJizdu).Select(r => r.JezdecId).ToList();

            var bodyQ3 = GetKlasifikace(kategorieId, [KoloTyp.Q1, KoloTyp.Q2, KoloTyp.Q3])
                .ToDictionary(r => r.JezdecId, r => r.Celkem);

            var finalisteIds = ZaverEngine.NasazFinaleZeSF(postup1, postup2, bodyQ3);
            var finalisteSet = finalisteIds.ToHashSet();

            var sfJezdci = h1.Concat(h2).Select(r => r.JezdecId).ToList();
            var nepostupujiciSF = sfJezdci.Where(id => !finalisteSet.Contains(id)).ToList();
            var sfSet = sfJezdci.ToHashSet();
            var zbyliQ3 = KvalifikovaniPoradi(kategorieId)
                .Where(id => !finalisteSet.Contains(id) && !sfSet.Contains(id)).ToList();
            var nahradniciIds = nepostupujiciSF.Concat(zbyliQ3).Distinct().ToList();

            return Jizda(finalisteIds, nahradniciIds);
        }

        var kval = KvalifikovaniPoradi(kategorieId);
        if (kval.Count == 0) return Chyba("Nejsou kvalifikovaní jezdci — zadej výsledky kvalifikace.");
        return Jizda(kval.Take(n).ToList(), kval.Skip(n).ToList());
    }

    public RostKolo ZapisRost(int kategorieId, KoloTyp typ, IReadOnlyList<RostZapisJizda> jizdy)
    {
        int koloId = EnsureKolo(kategorieId, typ);
        int potreba = Math.Max(1, jizdy.Count);

        using var tx = _db.Connection.BeginTransaction();
        try
        {
            int mam = _db.Connection.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM jizda WHERE kolo_id = @K", new { K = koloId }, tx);
            for (int c = mam + 1; c <= potreba; c++)
                _db.Connection.Execute("INSERT INTO jizda (kolo_id, cislo) VALUES (@K, @C)",
                    new { K = koloId, C = c }, tx);
            _db.Connection.Execute("DELETE FROM jizda WHERE kolo_id = @K AND cislo > @P",
                new { K = koloId, P = potreba }, tx);

            var jizdyDb = _db.Connection
                .Query<(int Id, int Cislo)>(
                    "SELECT id, cislo FROM jizda WHERE kolo_id = @K ORDER BY cislo", new { K = koloId }, tx)
                .ToDictionary(j => j.Cislo, j => j.Id);

            foreach (var jid in jizdyDb.Values)
                _db.Connection.Execute("DELETE FROM rost_pozice WHERE jizda_id = @J", new { J = jid }, tx);

            foreach (var jz in jizdy)
            {
                if (!jizdyDb.TryGetValue(jz.Cislo, out int jizdaId)) continue;
                // Finále má až 10 míst v jedné jízdě, proto neořezáváme na 8.
                var ids = jz.JezdecIds.Take(16).ToList();
                for (int i = 0; i < ids.Count; i++)
                    _db.Connection.Execute(
                        "INSERT INTO rost_pozice (jizda_id, pozice, jezdec_id) VALUES (@J, @P, @Id)",
                        new { J = jizdaId, P = i + 1, Id = ids[i] }, tx);
            }

            tx.Commit();
        }
        catch
        {
            tx.Rollback();
            throw;
        }

        return GetRost(koloId);
    }

    // Celkové výsledky (§9). Pořadí řídí finále, body se nepřičítají (Bq = body po Q3).
    public IReadOnlyList<CelkoveRadek> GetCelkove(int kategorieId)
    {
        var klas = GetKlasifikace(kategorieId, [KoloTyp.Q1, KoloTyp.Q2, KoloTyp.Q3]);

        Dictionary<int, int> PoradiKola(KoloTyp typ)
        {
            var kolo = GetKolo(kategorieId, typ);
            var m = new Dictionary<int, int>();
            if (kolo is null) return m;
            var rows = _db.Connection.Query<(int JezdecId, int? Poradi)>("""
                SELECT v.jezdec_id AS JezdecId, v.poradi AS Poradi
                FROM vysledek v JOIN jizda jz ON jz.id = v.jizda_id
                WHERE jz.kolo_id = @K
                """, new { K = kolo.Id });
            foreach (var r in rows)
                if (r.Poradi is not null) m[r.JezdecId] = r.Poradi.Value;
            return m;
        }

        var psfMap = PoradiKola(KoloTyp.SF);
        var pfMap  = PoradiKola(KoloTyp.F);

        var vstupy = klas.Select((r, i) => new CelkovyVstup(
            r.JezdecId,
            Pq: i + 1,
            Psf: psfMap.TryGetValue(r.JezdecId, out int psf) ? psf : null,
            Pf: pfMap.TryGetValue(r.JezdecId, out int pf) ? pf : null,
            Bq: r.Celkem)).ToList();

        var info  = klas.ToDictionary(r => r.JezdecId);
        var byId  = vstupy.ToDictionary(v => v.JezdecId);

        return ZaverEngine.CelkovePoradi(vstupy).Select((id, i) =>
        {
            var v = byId[id];
            var j = info[id];
            return new CelkoveRadek(i + 1, id, j.StCislo, j.Prijmeni, j.Jmeno,
                v.Pq, v.Psf, v.Pf, v.Bq);
        }).ToList();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private sealed record RostPoziceRow(
        int JizdaId, int Pozice,
        int JezdecId, int KategorieId, int? StCislo,
        string Prijmeni, string Jmeno, string Znacka, string Model,
        int? RokNarozeni, int? Los);

    private sealed record VysledekRowDb(
        int VysledekId, int JizdaId, int JezdecId,
        int? StCislo, string Prijmeni, string Jmeno, string Znacka, string Model,
        int? MerCasMs, int PenalizaceMs, string Stav,
        int? Poradi, int? Body, int? BodyRucni, int? RucniPoradi);

    private sealed record VysledekPrepocitejRow(
        int JezdecId, int? CasMs, int PenalizaceMs, string Stav, int? RucniPoradi);

    private static ZavodInfo Map(ZavodRow r) => new(
        r.Id, r.Nazev, r.Datum, r.Misto,
        Enum.Parse<RaceType>(r.Typ),
        r.PocetKategorii, r.PocetJezdcu);
}
