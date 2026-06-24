using Microsoft.Data.Sqlite;

namespace Verdict.Core.Data;

/// <summary>
/// Vyplni prazdnou DB vychozimi daty (zavod + kategorie + zebricek + pravidla + dev jezdci).
/// Port z src/main/db/seed.ts — 1:1 vcetne dev dat pro N1600.
/// Pokud uz nejaky zavod existuje, nedela nic.
/// </summary>
internal static class Seed
{
    /// <summary>
    /// Bodovy zebricek STANDARD. CLAUDE.md §4: 1=50, 2=45, 3=42, pak 44-poradi (min 0).
    /// </summary>
    private static int StandardBody(int pozice) => pozice switch
    {
        1 => 50,
        2 => 45,
        3 => 42,
        _ => Math.Max(0, 44 - pozice)   // 4→40, 5→39, ..., 44→0
    };

    private static readonly (string Nazev, string Ruleset)[] Kategorie =
    [
        ("Junior",        "STANDARD"),
        ("N1400",         "STANDARD"),
        ("N1600",         "STANDARD"),
        ("N1600+",        "STANDARD"),
        ("S1600",         "STANDARD"),
        ("S1600+",        "STANDARD"),
        ("Tuning",        "STANDARD"),
        ("Škoda Cup",     "STANDARD"),
        ("Cross Cup",     "STANDARD"),
        ("Dámský pohár",  "STANDARD"),
        ("Šotolina",      "STANDARD"),
    ];

    // Dev jezdci N1600 (prevzato z prototypu). [st_cislo, prijmeni, jmeno, znacka, model, los]
    private static readonly (int St, string Prijmeni, string Jmeno, string Znacka, string Model, int Los)[] N1600 =
    [
        (11,  "Šaroun",   "Adam",      "Volkswagen", "Lupo",    54),
        (94,  "Lagron",   "Jaroslav",  "Peugeot",    "306",     25),
        (779, "Bartuška", "Stanislav", "Peugeot",    "206",     65),
        (93,  "Ladra",    "Štěpán",    "Škoda",      "Favorit", 46),
        (197, "Vnouček",  "Franta",    "Peugeot",    "206",     32),
        (7,   "Novák",    "Petr",      "Škoda",      "Fabia",    8),
        (41,  "Dvořák",   "Martin",    "Citroën",    "Saxo",    17),
        (55,  "Procházka","Tomáš",     "Peugeot",    "205",     39),
        (23,  "Kučera",   "Lukáš",     "Škoda",      "Felicia", 71),
        (88,  "Veselý",   "Jan",       "Renault",    "Clio",    12),
        (12,  "Horák",    "Pavel",     "Volkswagen", "Polo",    50),
        (64,  "Němec",    "David",     "Opel",       "Corsa",   28),
        (3,   "Pokorný",  "Radek",     "Škoda",      "Favorit",  4),
        (71,  "Marek",    "Ondřej",    "Peugeot",    "106",     60),
        (28,  "Beneš",    "Jiří",      "Ford",       "Fiesta",  19),
        (5,   "Král",     "Michal",    "Citroën",    "C2",      43),
    ];

    public static void Run(SqliteConnection db)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM zavod";
        var count = Convert.ToInt32(cmd.ExecuteScalar());
        if (count > 0) return;

        using var tx = db.BeginTransaction();
        try
        {
            // Zavod
            long zavodId = Insert(db, tx,
                "INSERT INTO zavod (nazev, datum, misto, typ) VALUES ($n,$d,$m,$t)",
                ("$n", "MČR Autocross — Přerov"),
                ("$d", "2026-05-30"),
                ("$m", "Přerov"),
                ("$t", "RAC"));

            // Kategorie
            var katIds = new Dictionary<string, long>();
            foreach (var (nazev, ruleset) in Kategorie)
            {
                long id = Insert(db, tx,
                    "INSERT INTO kategorie (zavod_id, nazev, ruleset) VALUES ($z,$n,$r)",
                    ("$z", zavodId), ("$n", nazev), ("$r", ruleset));
                katIds[nazev] = id;
            }

            // Zebricek STANDARD — poradi 1..40
            for (int p = 1; p <= 40; p++)
                Insert(db, tx,
                    "INSERT INTO zebricek (ruleset, poradi, body) VALUES ('STANDARD',$p,$b)",
                    ("$p", p), ("$b", StandardBody(p)));

            // Pravidla STANDARD (CLAUDE.md §5 §8)
            Insert(db, tx,
                """
                INSERT INTO pravidla
                  (ruleset, max_na_jizdu, sf_prah, sf_max,
                   dnf_offset, dns_offset, dq_offset, dnf_body, dns_body, dq_body)
                VALUES ('STANDARD', 8, 12, 16, -1, -5, -10, NULL, NULL, NULL)
                """);

            // Dev jezdci N1600
            long n1600 = katIds["N1600"];
            foreach (var (st, prijmeni, jmeno, znacka, model, los) in N1600)
                Insert(db, tx,
                    "INSERT INTO jezdec (kategorie_id, st_cislo, prijmeni, jmeno, znacka, model, los)" +
                    " VALUES ($k,$s,$p,$j,$z,$m,$l)",
                    ("$k", n1600), ("$s", st), ("$p", prijmeni),
                    ("$j", jmeno), ("$z", znacka), ("$m", model), ("$l", los));

            tx.Commit();
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    private static long Insert(SqliteConnection db, SqliteTransaction tx,
        string sql, params (string Name, object Value)[] parameters)
    {
        using var cmd = db.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = sql;
        foreach (var (name, value) in parameters)
            cmd.Parameters.AddWithValue(name, value);
        cmd.ExecuteNonQuery();
        cmd.CommandText = "SELECT last_insert_rowid()";
        cmd.Parameters.Clear();
        return (long)(cmd.ExecuteScalar() ?? 0L);
    }
}
