// Schéma databáze podle CLAUDE.md §11. Vše s IF NOT EXISTS.
// Časy jsou v milisekundách (integer), datum jako text ISO (YYYY-MM-DD).
//
// SCHEMA_SQL = baseline pro fresh install (user_version = 0 → migration v1).
// Starší DB procházejí jednotlivými migracemi v migrate.ts, které dogonují
// stav na SCHEMA_VERSION. Proto jsou zde i tabulky přidané pozdějšími migracemi
// (mereni v6, uprava_log v7, zavod_id na mereni v8, mereni_timer v9).

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS zavod (
  id     INTEGER PRIMARY KEY,
  nazev  TEXT NOT NULL,
  datum  TEXT NOT NULL,                       -- ISO YYYY-MM-DD
  misto  TEXT NOT NULL DEFAULT '',
  typ    TEXT NOT NULL CHECK (typ IN ('RAC','RX'))
);

CREATE TABLE IF NOT EXISTS kategorie (
  id        INTEGER PRIMARY KEY,
  zavod_id  INTEGER NOT NULL REFERENCES zavod(id) ON DELETE CASCADE,
  nazev     TEXT NOT NULL,
  ruleset   TEXT NOT NULL DEFAULT 'STANDARD'
            CHECK (ruleset IN ('STANDARD','SOTOLINA'))
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
  nazev         TEXT NOT NULL                 -- jen Šotolina (fixní skupiny)
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
  pozice     INTEGER NOT NULL,                 -- 1..8
  jezdec_id  INTEGER NOT NULL REFERENCES jezdec(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vysledek (
  id              INTEGER PRIMARY KEY,
  jizda_id        INTEGER NOT NULL REFERENCES jizda(id) ON DELETE CASCADE,
  jezdec_id       INTEGER NOT NULL REFERENCES jezdec(id) ON DELETE CASCADE,
  namereny_cas_ms INTEGER,                     -- surové měření (NEpřepisovat)
  penalizace_ms   INTEGER NOT NULL DEFAULT 0,  -- časová penalizace ředitele
  stav            TEXT NOT NULL DEFAULT 'OK' CHECK (stav IN ('OK','DNF','DNS','DQ')),
  rucni_poradi    INTEGER,                     -- ruční přepis (přednost před časem)
  poradi          INTEGER,                     -- výsledné pořadí
  body            INTEGER,                     -- výsledné body
  poznamka        TEXT
);

-- Bodový žebříček dle pořadí (CLAUDE.md §4) — konfigurovatelný.
CREATE TABLE IF NOT EXISTS zebricek (
  id       INTEGER PRIMARY KEY,
  ruleset  TEXT NOT NULL CHECK (ruleset IN ('STANDARD','SOTOLINA')),
  poradi   INTEGER NOT NULL,
  body     INTEGER NOT NULL,
  UNIQUE (ruleset, poradi)
);

-- Vestavěné stopky: jeden řádek = jedno kliknutí v cíli (CLAUDE.md §11/§13).
-- zavod_id přidán migrací v8 (pro izolaci kanálů při přepnutí závodu).
CREATE TABLE IF NOT EXISTS mereni (
  id            INTEGER PRIMARY KEY,
  jizda_id      INTEGER NOT NULL REFERENCES jizda(id) ON DELETE CASCADE,
  zavod_id      INTEGER REFERENCES zavod(id) ON DELETE CASCADE,
  poradi_kliku  INTEGER NOT NULL,
  cas_ms        INTEGER NOT NULL,
  jezdec_id     INTEGER REFERENCES jezdec(id) ON DELETE SET NULL
);

-- Parametry pravidel dle ruleset (CLAUDE.md §5, §6, §8).
-- Penalizace stavů: u STANDARD relativně (offset od posledního místa),
-- u SOTOLINA absolutně (pevný počet bodů). Nepoužité hodnoty zůstávají NULL.
CREATE TABLE IF NOT EXISTS pravidla (
  id              INTEGER PRIMARY KEY,
  ruleset         TEXT NOT NULL UNIQUE CHECK (ruleset IN ('STANDARD','SOTOLINA')),
  max_na_jizdu    INTEGER NOT NULL DEFAULT 8,
  sf_prah         INTEGER,                     -- min. kvalifikovaných pro semifinále
  sf_max          INTEGER,                     -- max. do semifinále
  dnf_offset      INTEGER,                     -- STANDARD: poslední + offset (např. -1)
  dns_offset      INTEGER,                     -- STANDARD: -5
  dq_offset       INTEGER,                     -- STANDARD: -10
  dnf_body        INTEGER,                     -- SOTOLINA: pevné body (0)
  dns_body        INTEGER,                     -- SOTOLINA: 0
  dq_body         INTEGER                      -- SOTOLINA: -20
);

-- Audit zásahů ředitele (penalizace, posun pořadí…) — migrace v7 u starých DB.
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

-- Perzistentní stav časovače stopek (přežije zavření okna/pád) — migrace v9.
CREATE TABLE IF NOT EXISTS mereni_timer (
  jizda_id         INTEGER PRIMARY KEY REFERENCES jizda(id) ON DELETE CASCADE,
  zavod_id         INTEGER NOT NULL REFERENCES zavod(id) ON DELETE CASCADE,
  running          INTEGER NOT NULL DEFAULT 0,
  base_ms          INTEGER NOT NULL DEFAULT 0,
  start_epoch_ms   INTEGER
);

-- Indexy na FK sloupcích a kritických cestách stopek.
CREATE INDEX IF NOT EXISTS ix_mereni_zavod         ON mereni(zavod_id);
CREATE INDEX IF NOT EXISTS ix_mereni_timer_zavod   ON mereni_timer(zavod_id);
CREATE INDEX IF NOT EXISTS ix_uprava_vysledek      ON uprava_log(vysledek_id, kdy DESC);
CREATE INDEX IF NOT EXISTS ix_kolo_kategorie       ON kolo(kategorie_id);
CREATE INDEX IF NOT EXISTS ix_jizda_kolo           ON jizda(kolo_id);
CREATE INDEX IF NOT EXISTS ix_rost_jizda           ON rost_pozice(jizda_id);
CREATE INDEX IF NOT EXISTS ix_jezdec_kategorie     ON jezdec(kategorie_id);
CREATE INDEX IF NOT EXISTS ix_qagg_kolo            ON q_agregat_override(kolo_id);
-- Pokrývající index pro stopky: MAX(poradi_kliku) + ORDER BY poradi_kliku při jizda_id filtru.
CREATE INDEX IF NOT EXISTS ix_mereni_jizda_poradi  ON mereni(jizda_id, poradi_kliku);
`
