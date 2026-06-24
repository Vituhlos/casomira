namespace Verdict.Core.Data;

/// <summary>
/// Baseline SQL schema pro fresh install (user_version 0 → migrace v1).
/// Starsi DB prochazi migracemi v1–v13 v Migrations.cs.
/// Port z src/main/db/schema.ts — NEUPRAVOVAT bez synchronizace s migracemi.
/// </summary>
internal static class Schema
{
    public const string Sql = """
        CREATE TABLE IF NOT EXISTS zavod (
          id     INTEGER PRIMARY KEY,
          nazev  TEXT NOT NULL,
          datum  TEXT NOT NULL,
          misto  TEXT NOT NULL DEFAULT '',
          typ    TEXT NOT NULL CHECK (typ IN ('RAC','RX'))
        );

        CREATE TABLE IF NOT EXISTS kategorie (
          id             INTEGER PRIMARY KEY,
          zavod_id       INTEGER NOT NULL REFERENCES zavod(id) ON DELETE CASCADE,
          nazev          TEXT NOT NULL,
          ruleset        TEXT NOT NULL DEFAULT 'STANDARD'
                         CHECK (ruleset IN ('STANDARD','SOTOLINA')),
          finale_velikost INTEGER NOT NULL DEFAULT 8
        );

        CREATE TABLE IF NOT EXISTS jezdec (
          id            INTEGER PRIMARY KEY,
          kategorie_id  INTEGER NOT NULL REFERENCES kategorie(id) ON DELETE CASCADE,
          st_cislo      INTEGER,
          prijmeni      TEXT NOT NULL DEFAULT '',
          jmeno         TEXT NOT NULL DEFAULT '',
          znacka        TEXT NOT NULL DEFAULT '',
          model         TEXT NOT NULL DEFAULT '',
          rok_narozeni  INTEGER,
          los           INTEGER,
          UNIQUE (kategorie_id, st_cislo)
        );

        CREATE TABLE IF NOT EXISTS skupina (
          id            INTEGER PRIMARY KEY,
          kategorie_id  INTEGER NOT NULL REFERENCES kategorie(id) ON DELETE CASCADE,
          nazev         TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS kolo (
          id            INTEGER PRIMARY KEY,
          kategorie_id  INTEGER NOT NULL REFERENCES kategorie(id) ON DELETE CASCADE,
          typ           TEXT NOT NULL CHECK (typ IN ('Q1','Q2','Q3','SF','F','F_A','F_B')),
          poradi        INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS jizda (
          id          INTEGER PRIMARY KEY,
          kolo_id     INTEGER NOT NULL REFERENCES kolo(id) ON DELETE CASCADE,
          cislo       INTEGER NOT NULL,
          skupina_id  INTEGER REFERENCES skupina(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS rost_pozice (
          id         INTEGER PRIMARY KEY,
          jizda_id   INTEGER NOT NULL REFERENCES jizda(id) ON DELETE CASCADE,
          pozice     INTEGER NOT NULL,
          jezdec_id  INTEGER NOT NULL REFERENCES jezdec(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS vysledek (
          id              INTEGER PRIMARY KEY,
          jizda_id        INTEGER NOT NULL REFERENCES jizda(id) ON DELETE CASCADE,
          jezdec_id       INTEGER NOT NULL REFERENCES jezdec(id) ON DELETE CASCADE,
          namereny_cas_ms INTEGER,
          penalizace_ms   INTEGER NOT NULL DEFAULT 0,
          stav            TEXT NOT NULL DEFAULT 'OK' CHECK (stav IN ('OK','DNF','DNS','DQ')),
          rucni_poradi    INTEGER,
          poradi          INTEGER,
          body            INTEGER,
          body_rucni      INTEGER,
          poznamka        TEXT
        );

        CREATE UNIQUE INDEX IF NOT EXISTS ux_vysledek_jizda_jezdec
          ON vysledek(jizda_id, jezdec_id);

        CREATE TABLE IF NOT EXISTS zebricek (
          id       INTEGER PRIMARY KEY,
          ruleset  TEXT NOT NULL CHECK (ruleset IN ('STANDARD','SOTOLINA')),
          poradi   INTEGER NOT NULL,
          body     INTEGER NOT NULL,
          UNIQUE (ruleset, poradi)
        );

        CREATE TABLE IF NOT EXISTS pravidla (
          id              INTEGER PRIMARY KEY,
          ruleset         TEXT NOT NULL UNIQUE CHECK (ruleset IN ('STANDARD','SOTOLINA')),
          max_na_jizdu    INTEGER NOT NULL DEFAULT 8,
          sf_prah         INTEGER,
          sf_max          INTEGER,
          dnf_offset      INTEGER,
          dns_offset      INTEGER,
          dq_offset       INTEGER,
          dnf_body        INTEGER,
          dns_body        INTEGER,
          dq_body         INTEGER
        );

        CREATE TABLE IF NOT EXISTS nastaveni (
          klic    TEXT PRIMARY KEY,
          hodnota TEXT
        );

        CREATE TABLE IF NOT EXISTS mereni (
          id            INTEGER PRIMARY KEY,
          jizda_id      INTEGER NOT NULL REFERENCES jizda(id) ON DELETE CASCADE,
          zavod_id      INTEGER REFERENCES zavod(id) ON DELETE CASCADE,
          poradi_kliku  INTEGER NOT NULL,
          cas_ms        INTEGER NOT NULL,
          jezdec_id     INTEGER REFERENCES jezdec(id) ON DELETE SET NULL
        );

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
        );

        CREATE TABLE IF NOT EXISTS mereni_timer (
          jizda_id         INTEGER PRIMARY KEY REFERENCES jizda(id) ON DELETE CASCADE,
          zavod_id         INTEGER NOT NULL REFERENCES zavod(id) ON DELETE CASCADE,
          running          INTEGER NOT NULL DEFAULT 0,
          base_ms          INTEGER NOT NULL DEFAULT 0,
          start_epoch_ms   INTEGER
        );

        CREATE TABLE IF NOT EXISTS q_agregat_override (
          id         INTEGER PRIMARY KEY,
          kolo_id    INTEGER NOT NULL REFERENCES kolo(id) ON DELETE CASCADE,
          jezdec_id  INTEGER NOT NULL REFERENCES jezdec(id) ON DELETE CASCADE,
          body_rucni INTEGER NOT NULL,
          UNIQUE(kolo_id, jezdec_id)
        );

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

        CREATE INDEX IF NOT EXISTS ix_kolo_kategorie   ON kolo(kategorie_id);
        CREATE INDEX IF NOT EXISTS ix_jizda_kolo       ON jizda(kolo_id);
        CREATE INDEX IF NOT EXISTS ix_rost_jizda       ON rost_pozice(jizda_id);
        CREATE INDEX IF NOT EXISTS ix_jezdec_kategorie ON jezdec(kategorie_id);
        CREATE INDEX IF NOT EXISTS ix_uprava_vysledek  ON uprava_log(vysledek_id, kdy DESC);
        CREATE INDEX IF NOT EXISTS ix_mereni_zavod     ON mereni(zavod_id);
        CREATE INDEX IF NOT EXISTS ix_mereni_timer_zavod ON mereni_timer(zavod_id);
        CREATE INDEX IF NOT EXISTS ix_qagg_kolo        ON q_agregat_override(kolo_id);
        """;
}
