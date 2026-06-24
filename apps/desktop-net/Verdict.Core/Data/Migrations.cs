using Microsoft.Data.Sqlite;

namespace Verdict.Core.Data;

/// <summary>Migrace databáze v1–v13. Každý krok je idempotentní (IF NOT EXISTS, kontrola sloupce před ALTER).</summary>
internal static class Migrations
{
    public const int SchemaVersion = 14;

    public static void Migrate(SqliteConnection db)
    {
        int version = GetUserVersion(db);

        if (version < 1)
        {
            Step(db, 1, () => db.Execute(Schema.Sql));
            version = 1;
        }

        if (version < 2)
        {
            Step(db, 2, () => db.Execute(
                "CREATE UNIQUE INDEX IF NOT EXISTS ux_vysledek_jizda_jezdec " +
                "ON vysledek(jizda_id, jezdec_id)"));
            version = 2;
        }

        if (version < 3)
        {
            Step(db, 3, () => db.Execute(
                "ALTER TABLE vysledek ADD COLUMN body_rucni INTEGER"));
            version = 3;
        }

        if (version < 4)
        {
            Step(db, 4, () => db.Execute(
                "ALTER TABLE kategorie ADD COLUMN finale_velikost INTEGER NOT NULL DEFAULT 8"));
            version = 4;
        }

        if (version < 5)
        {
            Step(db, 5, () => db.Execute(
                "CREATE TABLE IF NOT EXISTS nastaveni (klic TEXT PRIMARY KEY, hodnota TEXT)"));
            version = 5;
        }

        if (version < 6)
        {
            Step(db, 6, () => db.Execute("""
                CREATE TABLE IF NOT EXISTS mereni (
                  id           INTEGER PRIMARY KEY,
                  jizda_id     INTEGER NOT NULL REFERENCES jizda(id) ON DELETE CASCADE,
                  poradi_kliku INTEGER NOT NULL,
                  cas_ms       INTEGER NOT NULL,
                  jezdec_id    INTEGER REFERENCES jezdec(id) ON DELETE SET NULL
                )
                """));
            version = 6;
        }

        if (version < 7)
        {
            Step(db, 7, () =>
            {
                db.Execute("""
                    CREATE TABLE IF NOT EXISTS uprava_log (
                      id          INTEGER PRIMARY KEY,
                      vysledek_id INTEGER NOT NULL REFERENCES vysledek(id) ON DELETE CASCADE,
                      typ         TEXT NOT NULL CHECK (typ IN (
                        'CASOVA_PENALIZACE','BODOVA_PENALIZACE','POSUN_PORADI','ZRUSENI'
                      )),
                      hodnota     INTEGER,
                      duvod       TEXT NOT NULL,
                      rozhodl     TEXT NOT NULL DEFAULT 'ředitel',
                      kdy         TEXT NOT NULL
                    )
                    """);
                db.Execute(
                    "CREATE INDEX IF NOT EXISTS ix_uprava_vysledek " +
                    "ON uprava_log(vysledek_id, kdy DESC)");
            });
            version = 7;
        }

        if (version < 8)
        {
            Step(db, 8, () =>
            {
                if (!HasColumn(db, "mereni", "zavod_id"))
                {
                    db.Execute(
                        "ALTER TABLE mereni ADD COLUMN zavod_id INTEGER " +
                        "REFERENCES zavod(id) ON DELETE CASCADE");
                    db.Execute("""
                        UPDATE mereni SET zavod_id = (
                          SELECT k.zavod_id FROM jizda jz
                          JOIN kolo ko ON ko.id = jz.kolo_id
                          JOIN kategorie k ON k.id = ko.kategorie_id
                          WHERE jz.id = mereni.jizda_id
                        )
                        """);
                    db.Execute("DELETE FROM mereni WHERE zavod_id IS NULL");
                }
                db.Execute("CREATE INDEX IF NOT EXISTS ix_mereni_zavod ON mereni(zavod_id)");
            });
            version = 8;
        }

        if (version < 9)
        {
            Step(db, 9, () =>
            {
                db.Execute("""
                    CREATE TABLE IF NOT EXISTS mereni_timer (
                      jizda_id         INTEGER PRIMARY KEY REFERENCES jizda(id) ON DELETE CASCADE,
                      zavod_id         INTEGER NOT NULL REFERENCES zavod(id) ON DELETE CASCADE,
                      running          INTEGER NOT NULL DEFAULT 0,
                      base_ms          INTEGER NOT NULL DEFAULT 0,
                      start_epoch_ms   INTEGER
                    )
                    """);
                db.Execute(
                    "CREATE INDEX IF NOT EXISTS ix_mereni_timer_zavod ON mereni_timer(zavod_id)");
            });
            version = 9;
        }

        if (version < 10)
        {
            Step(db, 10, () =>
            {
                db.Execute("""
                    CREATE TABLE IF NOT EXISTS q_agregat_override (
                      id         INTEGER PRIMARY KEY,
                      kolo_id    INTEGER NOT NULL REFERENCES kolo(id) ON DELETE CASCADE,
                      jezdec_id  INTEGER NOT NULL REFERENCES jezdec(id) ON DELETE CASCADE,
                      body_rucni INTEGER NOT NULL,
                      UNIQUE(kolo_id, jezdec_id)
                    )
                    """);
                db.Execute(
                    "CREATE INDEX IF NOT EXISTS ix_qagg_kolo ON q_agregat_override(kolo_id)");
            });
            version = 10;
        }

        if (version < 11)
        {
            Step(db, 11, () => db.Execute(
                "UPDATE kategorie SET ruleset = 'STANDARD' WHERE ruleset = 'SOTOLINA'"));
            version = 11;
        }

        if (version < 12)
        {
            Step(db, 12, () => db.Execute("""
                CREATE TABLE IF NOT EXISTS sportity_zavod_map (
                  zavod_id             INTEGER PRIMARY KEY REFERENCES zavod(id) ON DELETE CASCADE,
                  channel_password     TEXT NOT NULL,
                  event_id             TEXT,
                  results_folder_id    TEXT NOT NULL,
                  results_folder_name  TEXT NOT NULL,
                  updated_at           TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sportity_kategorie_map (
                  kategorie_id  INTEGER PRIMARY KEY REFERENCES kategorie(id) ON DELETE CASCADE,
                  folder_id     TEXT NOT NULL,
                  folder_name   TEXT NOT NULL,
                  updated_at    TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sportity_document_map (
                  id            INTEGER PRIMARY KEY,
                  kategorie_id  INTEGER NOT NULL REFERENCES kategorie(id) ON DELETE CASCADE,
                  list_key      TEXT NOT NULL,
                  document_id   TEXT NOT NULL,
                  updated_at    TEXT NOT NULL,
                  UNIQUE(kategorie_id, list_key)
                );
                CREATE TABLE IF NOT EXISTS sportity_publish_log (
                  id           INTEGER PRIMARY KEY,
                  zavod_id     INTEGER REFERENCES zavod(id) ON DELETE SET NULL,
                  kategorie_id INTEGER REFERENCES kategorie(id) ON DELETE SET NULL,
                  list_key     TEXT,
                  action       TEXT NOT NULL,
                  status       TEXT NOT NULL,
                  message      TEXT,
                  created_at   TEXT NOT NULL
                );
                """));
            version = 12;
        }

        if (version < 13)
        {
            Step(db, 13, () => db.Execute("""
                CREATE INDEX IF NOT EXISTS ix_kolo_kategorie   ON kolo(kategorie_id);
                CREATE INDEX IF NOT EXISTS ix_jizda_kolo       ON jizda(kolo_id);
                CREATE INDEX IF NOT EXISTS ix_rost_jizda       ON rost_pozice(jizda_id);
                CREATE INDEX IF NOT EXISTS ix_jezdec_kategorie ON jezdec(kategorie_id);
                """));
            version = 13;
        }

        if (version < 14)
        {
            Step(db, 14, () =>
            {
                // Přidání ZMENA_STAVU do CHECK — SQLite to vyžaduje rekreaci tabulky.
                db.Execute("""
                    CREATE TABLE uprava_log_new (
                      id          INTEGER PRIMARY KEY,
                      vysledek_id INTEGER NOT NULL REFERENCES vysledek(id) ON DELETE CASCADE,
                      typ         TEXT NOT NULL CHECK (typ IN (
                        'CASOVA_PENALIZACE','BODOVA_PENALIZACE','POSUN_PORADI','ZRUSENI','ZMENA_STAVU'
                      )),
                      hodnota     INTEGER,
                      duvod       TEXT NOT NULL,
                      rozhodl     TEXT NOT NULL DEFAULT 'ředitel',
                      kdy         TEXT NOT NULL
                    )
                    """);
                db.Execute("INSERT INTO uprava_log_new SELECT * FROM uprava_log");
                db.Execute("DROP TABLE uprava_log");
                db.Execute("ALTER TABLE uprava_log_new RENAME TO uprava_log");
                db.Execute("CREATE INDEX ix_uprava_vysledek ON uprava_log(vysledek_id, kdy DESC)");
            });
            version = 14;
        }

        // pojistka — synchronizuje user_version při přeskočení více kroků najednou
        if (version < SchemaVersion)
            db.Execute($"PRAGMA user_version = {SchemaVersion}");
    }

    // ---- helpers ----

    private static int GetUserVersion(SqliteConnection db)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = "PRAGMA user_version";
        return Convert.ToInt32(cmd.ExecuteScalar());
    }

    private static bool HasColumn(SqliteConnection db, string table, string column)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = $"PRAGMA table_info({table})";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            if (reader.GetString(1).Equals(column, StringComparison.OrdinalIgnoreCase))
                return true;
        return false;
    }

    private static void Step(SqliteConnection db, int targetVersion, Action fn)
    {
        using var tx = db.BeginTransaction();
        fn();
        db.Execute($"PRAGMA user_version = {targetVersion}", transaction: tx);
        tx.Commit();
    }
}

// pomocná extenze — zkracuje kód kroků migrace
file static class SqliteConnectionExtensions
{
    public static void Execute(this SqliteConnection db, string sql,
        SqliteTransaction? transaction = null)
    {
        using var cmd = db.CreateCommand();
        cmd.Transaction = transaction;
        cmd.CommandText = sql;
        cmd.ExecuteNonQuery();
    }
}
