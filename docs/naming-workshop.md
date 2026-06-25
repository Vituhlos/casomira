# Naming Workshop — Casomira / Casomira Timing

Date: 2026-06-16  
Method: local `.naming.md`, adapted from `glacierphonk/naming` with a motorsport-specific layer.

## Method Notes

This workshop follows a metaphor-driven naming process:

- brief before names
- metaphor territories before candidates
- strict anti-slop filtering
- Czech + English pronunciation checks
- early conflict/domain sanity checks
- decision over novelty

Useful external reference: <https://github.com/glacierphonk/naming>

This is not a trademark clearance report. Domain and search checks are early signals only.

## Repository Evidence

The current product is not only a stopwatch:

- `package.json`: package name `casomira`, description `Časomíra — správce závodu autokros / rallycross`
- `electron-builder.yml`: installed app is `Časomíra`, executable/artifacts use `Casomira`
- `README.md`: offline desktop replacement for Excel timekeeping workbooks
- `CLAUDE.md`: one operator, one computer, SQLite, RAC/RX race logic, grids, results, penalties, PDF export
- `docs/design.md`: data-heavy race operations UI, not a marketing or SaaS dashboard
- brand assets: finished Casomira lockup, symbol, icon, palette, installer assets

The product position is:

> Offline desktop timing, race administration, and official results software for rallycross/autocross-style events.

## Naming Brief

### What it does

The app turns a messy race-day workflow — start lists, grids, heats, measured times, penalties, classification, finals, exports — into one local authoritative system.

### Who it is for

- timekeepers
- race organizers
- sport commissioners
- small-to-medium motorsport clubs
- rallycross/autocross/hill climb/autoslalom events

### What it should feel like

- calm under pressure
- precise
- official
- mechanical enough to belong at a track
- modern enough to be credible as software
- not flashy, not "speed" marketing

### Forbidden patterns

Dead on arrival:

- RaceTime
- SpeedTimer
- LapTimer
- RaceTrack Pro
- ChronoMaster
- TimeKeeper
- ChronoX
- anything with decorative `-ly`, `-ify`, `-ora`, `-ix`
- empty compounds like SmartHub, AutoFlow, DataSync, TimingCloud

## Core Strategic Finding

The name should not describe "time".

The strongest territory is **authority at the measurement line**:

- a timing gate
- a physical mark
- an official post
- a ledger of what happened
- a race official who can stand behind the result

The best names should sound less like a stopwatch and more like an instrument that produces the official result.

## Current Name Analysis

### Časomíra

**Meaning:** Czech word/formation for time measurement/timekeeping.  
**Strength:** domestic clarity, trust, exact semantic fit.  
**Weakness:** diacritics, pronunciation outside Czech/Slovak, generic search collisions around timekeeping.  
**Brand feel:** grounded, trustworthy, local, human.  
**Software fit:** good, but requires ASCII infrastructure.

### Casomira

**Meaning:** ASCII/internationalized form of Časomíra.  
**Strength:** keeps the origin, works in filenames/installers/domains, already used by repo/package/installer.  
**Weakness:** English speakers do not know the meaning until told; four syllables; exact `.com` has existing timing-related history.  
**Brand feel:** more like a proper product name than a category label.  
**Software fit:** excellent.

Strict read: the existing brand is already stronger than a lot of clean-sheet alternatives because it has history, assets, rhythm, and product fit.

## Metaphor Territories

### 1. Measurement Line

Examples: gate, beam, stripe, mark, split, sector, loop.

Works because race timing happens at a line/gate. Strong for software + hardware future. Risk: many compounds become generic.

### 2. Official Record

Examples: ledger, register, logbook, docket, tally, verdict.

Works because the app creates the record of the race. Risk: legal/accounting associations.

### 3. Race Authority

Examples: marshal, steward, clerk, arbiter, control post.

Works because the app is trusted by officials. Risk: names can sound like people-management or legal tools.

### 4. Precision Instrument

Examples: caliper, gauge, vernier, datum, plumbline.

Works because the product must feel measured and technical. Risk: less motorsport-specific, some names imply hardware.

### 5. Race Structure

Examples: grid, heat, sector, stage, rostrum, pylon.

Works because it speaks the language of motorsport. Risk: can become too narrow or too literal.

### 6. Signal And Trigger

Examples: beacon, pulse, flagfall, trigger, photogate.

Works because timing starts from signals and records events. Risk: can sound like alerting software.

### 7. Terrain

Examples: gravel, tarmac, crest, parc, paddock.

Works because rallycross is physical and dirty. Risk: terrain names may not imply software or official results.

### 8. Existing Czech Root

Examples: Časomíra, Casomira, Startomíra, Chronomíra.

Works because it carries local credibility. Risk: international pronunciation and generic Czech category meaning.

## Quick Availability And Conflict Signals

Checks performed: web search plus DNS sanity checks for selected finalists.

- `casomira.com` appears tied to an older timing/measuring project and Czech timing contexts; `casomira.eu` / `sport-casomira.cz` also create generic-category noise.
- `casomira.app`, `casomira.co`, `casomira.dev` returned no DNS in a quick check.
- `caliper.com`, `.app`, `.co`, `.dev` all resolve; "caliper" is also heavily occupied by brake hardware and other companies.
- `gatepost.com`, `.app`, `.dev` resolve; `getgatepost.com` exists as an offline-first field app; `gatepost.co` returned no DNS.
- `gridmark` has existing companies, including Gridmark Inc.; `.co`/`.dev` looked more workable than exact `.com`.
- `marshal` has a direct-ish collision: "Virtual Marshal" is an auto timing app.
- `ledger` is effectively dead as a brand direction because of the huge crypto hardware brand.

## Working Longlist

Scores: SW = software fit, Moto = motorsport fit, Brand = long-term brand potential. 1-5 scale.

| # | Candidate | Meaning / inspiration | Pronunciation | Strength | Weakness | SW | Moto | Brand |
|---:|---|---|---|---|---|---:|---:|---:|
| 1 | Casomira | ASCII form of Časomíra | ka-so-MEE-ra | Authentic, existing assets, internationalized | Meaning hidden outside CZ/SK | 5 | 4 | 5 |
| 2 | Časomíra | Czech timekeeping/measure | cha-so-MEE-ra | Exact domestic meaning | Diacritics, generic CZ category | 4 | 4 | 4 |
| 3 | Casomira Timing | Brand + category descriptor | ka-so-MEE-ra TIE-ming | Clear internationally | Descriptor should not be the core mark | 5 | 5 | 4 |
| 4 | Gatepost | Gate + official post | GATE-post | Concrete, track-like, logoable | Existing field app, exact domains tight | 5 | 4 | 5 |
| 5 | Caliper | Precision measuring tool / brake caliper | KAL-i-per | Technical, premium, motorsport-adjacent | Hardware/brake association, crowded | 5 | 4 | 5 |
| 6 | Pylon | Track cone / scoring tower | PIE-lon | Short, visual, race-adjacent | Many uses, less official | 4 | 5 | 4 |
| 7 | Datum | Reference point for measurement | DAY-tum | Precise, technical | Abstract, crowded | 5 | 3 | 4 |
| 8 | Gauge | Measuring instrument / dashboard | GAYJ | Simple, technical, automotive | Very broad, exact domains crowded | 4 | 4 | 4 |
| 9 | Vernier | Precision scale | VER-nee-er | Deep precision metaphor | Less familiar, harder phone test | 4 | 3 | 4 |
| 10 | Beamline | Timing beam + line | BEEM-line | Strong measurement image | Physics/science associations | 5 | 4 | 4 |
| 11 | Sector | Timed section of track | SEK-tor | Motorsport language, short | Generic word, crowded | 4 | 5 | 3 |
| 12 | Sectoris | Sector-derived brand form | sek-TOR-is | More ownable than Sector | Slight fake-Latin risk | 5 | 5 | 4 |
| 13 | Gridmark | Grid + official mark | GRID-mark | Race structure + record | Compound, existing company use | 5 | 5 | 4 |
| 14 | Splitmark | Split time + mark | SPLIT-mark | Timing-specific and clear | Less race-control breadth | 5 | 4 | 4 |
| 15 | Loopmark | Timing loop + mark | LOOP-mark | Good for future hardware loops | RFID/hardware-specific | 5 | 4 | 4 |
| 16 | Linebook | Official book of lines/results | LINE-book | Record + timing line | Fashion catalog term, not racey | 4 | 3 | 3 |
| 17 | TrackLedger | Track record ledger | trak-LED-jer | Official/audit feel | Ledger collision and accounting tone | 4 | 4 | 2 |
| 18 | HeatLedger | Heat results ledger | HEET-led-jer | Rallycross heat-specific | Narrow + ledger issue | 4 | 5 | 2 |
| 19 | Clerk | Clerk of the Course | KLERK | Official role, short | Strong existing tech brand, narrow | 4 | 4 | 2 |
| 20 | Steward | Motorsport official | STOO-erd | Authority, penalties, fairness | Less timing-specific, domains crowded | 4 | 5 | 4 |
| 21 | Marshal | Race marshal | MAR-shal | Strong motorsport authority | Virtual Marshal timing collision | 4 | 5 | 2 |
| 22 | Arbiter | Decision maker | AR-bi-ter | Official, decisive | Legal/game tone, less timing | 4 | 3 | 3 |
| 23 | Rostrum | Podium/platform for official result | ROS-trum | Premium, result-oriented | Not timing-specific | 4 | 4 | 4 |
| 24 | Rostra | Rostrum + Czech "rošty" echo | ROS-tra | Elegant, grid echo | Existing automotive Rostra brand | 4 | 4 | 3 |
| 25 | Parc | Parc fermé / race paddock control | PARK | Motorsport insider feel | Too obscure for broad users | 3 | 5 | 3 |
| 26 | Parcline | Parc + line | PARK-line | Motorsport + measurement line | Niche, may confuse | 4 | 4 | 3 |
| 27 | Stagepost | Stage + official post | STAYJ-post | Rally/hillclimb fit | Less rallycross/grid fit | 4 | 4 | 3 |
| 28 | Stagebook | Stage records | STAYJ-book | Good for rally results | Narrower than product | 4 | 4 | 3 |
| 29 | Flagfall | Moment race begins | FLAG-fall | Real racing word, vivid | Horse racing/taxi associations | 4 | 4 | 4 |
| 30 | Flagpost | Flag signal + marshal post | FLAG-post | Track authority visual | Existing AI/company uses | 4 | 4 | 3 |
| 31 | Checkpoint | Control point | CHEK-point | Clear and international | Too generic | 4 | 4 | 2 |
| 32 | Controlpost | Race control post | con-TROL-post | Authority + location | Too descriptive | 4 | 4 | 2 |
| 33 | Timepost | Time + official post | TIME-post | Clearer than Gatepost | Too close to generic time naming | 4 | 3 | 2 |
| 34 | Gatehouse | Control building at gate | GATE-house | Stable, official | Real estate/security feel | 4 | 3 | 3 |
| 35 | Lapboard | Pit board / lap board | LAP-board | Track object | Too lap-racing-specific | 3 | 4 | 3 |
| 36 | Scorepost | Scoreboard/post | SCORE-post | Results authority | Sports-generic | 4 | 3 | 3 |
| 37 | Runbook | Operational procedure book | RUN-book | Offline ops, procedure | DevOps term, less racing | 4 | 2 | 2 |
| 38 | Racebook | Race records | RACE-book | Obvious category | Generic and social-network-like | 3 | 4 | 2 |
| 39 | Logbook | Official log | LOG-book | Audit trail, offline records | Generic software term | 4 | 3 | 3 |
| 40 | Tally | Count/score | TAL-ee | Short, human, scoring | Less premium, less race-specific | 4 | 2 | 3 |
| 41 | Tallymark | Count mark | TAL-ee-mark | Result recording image | Slightly quaint | 4 | 3 | 3 |
| 42 | Ledgerline | Record + measurement line | LED-jer-line | Official + visual | Ledger baggage | 4 | 3 | 2 |
| 43 | Orderline | Race order + line | OR-der-line | Classification metaphor | Logistics/order confusion | 4 | 3 | 3 |
| 44 | Verdict | Official decision | VER-dikt | Strong authority | Too legal/severe | 4 | 2 | 3 |
| 45 | Ruling | Official decision | ROO-ling | Penalty/result authority | Legalistic, not product-like | 3 | 2 | 2 |
| 46 | Measure | Measurement | MEH-zher | Exact and simple | Too generic | 3 | 2 | 2 |
| 47 | Meridian | Time/navigation reference | mer-ID-ee-an | Elegant, long-term | Indirect, crowded | 4 | 2 | 4 |
| 48 | Bearing | Navigation direction | BAIR-ing | Calm, technical | More navigation than timing | 4 | 2 | 3 |
| 49 | Waypoint | Rally/navigation point | WAY-point | Clear for route/checkpoint | Navigation app associations | 4 | 3 | 3 |
| 50 | Reference | Reference point | REF-er-ens | Precision/data tone | Too generic | 3 | 2 | 2 |
| 51 | Fiducial | Reference marker | fi-DOO-shal | Deep measurement metaphor | Too obscure | 3 | 2 | 3 |
| 52 | Index | Ordering/reference | IN-dex | Software and classification | Too generic | 4 | 2 | 2 |
| 53 | Register | Official record | REJ-is-ter | Authority and records | Generic registry/admin feel | 4 | 3 | 3 |
| 54 | Registry | System of record | REJ-is-tree | Software-like | Corporate/generic | 4 | 2 | 2 |
| 55 | Notary | Witness/official record | NO-ta-ree | Trust and verification | Legal, not motorsport | 4 | 2 | 3 |
| 56 | Keystone | Central locking stone | KEE-stone | Stability/authority | Overused metaphor | 3 | 2 | 2 |
| 57 | Plumbline | Precision reference line | PLUM-line | Concrete measurement line | Construction, not racing | 4 | 2 | 3 |
| 58 | Baseline | Reference line | BASE-line | Measurement/data metaphor | Generic business term | 4 | 2 | 2 |
| 59 | Crossline | Crossing timing line | CROSS-line | Race finish image | Could imply crossing a line negatively | 4 | 4 | 3 |
| 60 | Finishline | Finish line | FIN-ish-line | Obvious race metaphor | Too generic, existing brands | 3 | 5 | 1 |
| 61 | Startgate | Start gate | START-gate | Rallycross/autoslalom clear | Descriptive, not all workflows | 4 | 4 | 2 |
| 62 | Splitline | Split timing line | SPLIT-line | Timing-specific | Common compound | 4 | 4 | 3 |
| 63 | Sectorline | Sector timing line | SEK-tor-line | Motorsport clear | Long/descriptive | 4 | 5 | 3 |
| 64 | Heatline | Heat/race line | HEET-line | Rallycross heats | Narrow, compound | 4 | 5 | 3 |
| 65 | Gridline | Grid + line | GRID-line | Race structure | Common word/design term | 4 | 4 | 3 |
| 66 | Markline | Mark + line | MARK-line | Result mark + line | Sounds manufactured | 3 | 3 | 2 |
| 67 | Coursebook | Official course records | COURSE-book | Hillclimb/autoslalom fit | Educational/catalog feel | 4 | 3 | 3 |
| 68 | Coursemark | Course marker | COURSE-mark | Physical race marker | Less timing authority | 4 | 3 | 3 |
| 69 | Routemark | Route + mark | ROUTE-mark | Checkpoint/route fit | Logistics associations | 4 | 3 | 3 |
| 70 | Rallypost | Rally + post | RAL-ee-post | Motorsport and official post | Too rally-specific | 4 | 4 | 3 |
| 71 | Rallybook | Rally record book | RAL-ee-book | Friendly and clear | Too broad/generic | 3 | 4 | 2 |
| 72 | Gravelmark | Gravel + measurement mark | GRAV-el-mark | Rallycross terrain | Too terrain-specific | 4 | 4 | 3 |
| 73 | Tarmac | Track surface | TAR-mak | Motorsport feel | Airport/software conflicts, not timing | 3 | 4 | 2 |
| 74 | Crest | Rally road feature | KREST | Short, premium | Thesaurus/startup overuse risk | 4 | 3 | 2 |
| 75 | Apex | Corner apex | AY-pex | Motorsport term | Overused, thesaurus/slop territory | 3 | 4 | 1 |
| 76 | Apexpost | Apex + post | AY-pex-post | Race image + official post | Awkward and corner-focused | 3 | 3 | 2 |
| 77 | Brakepoint | Braking point | BRAKE-point | Racing precision | Driver coaching, not timing | 3 | 4 | 3 |
| 78 | Brakemarker | Braking marker board | BRAKE-marker | Concrete track object | Long, driver-focused | 3 | 4 | 3 |
| 79 | Board | Pit/result board | BORD | Short | Too generic | 2 | 2 | 1 |
| 80 | Pitboard | Pit board | PIT-board | Race object, results | Circuit racing/pit-specific | 3 | 4 | 3 |
| 81 | Paddock | Motorsport working area | PAD-ock | Strong race atmosphere | Not timing/results | 3 | 4 | 3 |
| 82 | Paddock Ledger | Race admin record | PAD-ock LED-jer | Accurate race admin | Too long, ledger baggage | 3 | 4 | 2 |
| 83 | Parc Ferme | Secured post-race area | park fer-MAY | Authentic motorsport term | Spelling/pronunciation barrier | 3 | 4 | 3 |
| 84 | Transponder | Timing hardware | trans-PON-der | Category recognition | Hardware-only and generic | 3 | 5 | 1 |
| 85 | Trigger | Event trigger | TRIG-er | Timing event metaphor | Generic automation/security | 4 | 2 | 3 |
| 86 | Tripline | Trigger line | TRIP-line | Physical timing trigger | Travel/accident associations | 4 | 3 | 3 |
| 87 | Beampost | Beam + official post | BEEM-post | Timing line + post | Slightly awkward | 4 | 4 | 3 |
| 88 | Lightgate | Photo gate | LIGHT-gate | Hardware timing image | Hardware-specific | 4 | 4 | 3 |
| 89 | Photogate | Timing photocell gate | FO-to-gate | Exact instrument | Too hardware/science-lab | 4 | 4 | 2 |
| 90 | Photoline | Photo finish line | FO-to-line | Finish measurement | Photo-printing associations | 4 | 4 | 3 |
| 91 | Bluebeam | Blue pivot/beam | BLUE-beam | Fits current icon color | Existing major software brand | 3 | 2 | 1 |
| 92 | Pivot | Central point | PIV-ot | Fits current blue pivot symbol | Generic startup word | 4 | 2 | 2 |
| 93 | Pivotline | Pivot + measurement line | PIV-ot-line | Icon and line story | Manufactured compound | 4 | 3 | 3 |
| 94 | Pivotmark | Pivot + mark | PIV-ot-mark | Symbol-compatible | Less race language | 4 | 3 | 3 |
| 95 | Clockhouse | Place where timing lives | CLOCK-house | Concrete, stable | Old-fashioned, not motorsport | 3 | 2 | 3 |
| 96 | Chronos | Greek time | KRO-nos | Obvious time myth | Overused, generic timing | 3 | 2 | 1 |
| 97 | Chronica | Chronicle/record | KRON-i-ka | Record story | Fake-classical feel | 3 | 2 | 2 |
| 98 | Ordo | Latin order | OR-do | Order/classification, short | Abstract, foreign-word risk | 4 | 2 | 3 |
| 99 | Ordinal | Ordered ranking | OR-di-nal | Classification/data | Too technical/math | 4 | 2 | 3 |
| 100 | Cadence | Rhythm/sequence | KAY-dens | Time and flow | Generic SaaS/productivity feel | 4 | 2 | 2 |

## Killed Or Downgraded

- RaceTime / SpeedTimer / LapTimer / ChronoMaster: generic category naming.
- Syncora / Apexora / Nexagen-style forms: decorative suffix/name-slop.
- Ledger: good metaphor but killed by dominant existing brand.
- Marshal: strong metaphor, but direct-ish timing app collision.
- Bluebeam: impossible due major software brand.
- Apex: overused motorsport/thesaurus word.
- Finishline: too generic and occupied.
- Timepost: better than TimeKeeper, but still too close to generic "time + noun".

## TOP 20

1. Casomira
2. Gatepost
3. Caliper
4. Pylon
5. Datum
6. Rostrum
7. Gauge
8. Vernier
9. Sectoris
10. Beamline
11. Steward
12. Gridmark
13. Splitmark
14. Loopmark
15. Flagfall
16. Parc
17. Tallymark
18. Meridian
19. Ordo
20. Paddock

## TOP 10

1. Casomira
2. Gatepost
3. Caliper
4. Pylon
5. Datum
6. Rostrum
7. Gauge
8. Vernier
9. Sectoris
10. Beamline

## TOP 5

1. Casomira
2. Gatepost
3. Caliper
4. Pylon
5. Datum

## Winner

### Casomira

Recommendation: make **Casomira** the canonical product name, with **Časomíra** as the Czech display/local form and **Casomira Timing** as the category descriptor when needed.

This is a naming correction, not a full rebrand.

### Why it wins

Casomira is the only candidate that combines:

- existing brand equity in this repository
- an authentic origin story
- strong Czech semantic fit
- an ASCII-safe international form
- current installer/package alignment
- existing logo/icon system
- low "AI-generated startup name" smell

The name is not a generic English category label. It is a specific product name with a story:

> Casomira comes from Czech "Časomíra": the instrument and authority of timekeeping. It was born from real Czech rallycross/autocross workflows, then internationalized into an ASCII product mark.

### Why it can last 10-20 years

- It is not tied to a temporary technology such as AI, cloud, sync, live, or transponder.
- It can grow from stopwatch/export software into race control, results, archive, and publishing.
- It can carry modules: Casomira Timing, Casomira Results, Casomira Control, Casomira Archive.
- It has a distinctive enough sound to become owned through use.

### Logo behavior

The existing logo already works:

- wordmark has clean geometric rhythm
- symbol has a measurement/pivot/apex story
- the mark can stand alone as an app icon
- `Casomira` is more visually stable in logos than `Časomíra` for international contexts

### Domain strategy

Avoid relying on exact `.com`.

Viable directions to verify formally:

- `casomira.app`
- `casomira.co`
- `casomira.dev`
- `getcasomira.com`
- `casomiratiming.com`

Because `casomira.com` and Czech timekeeping contexts already exist, trademark/domain clearance is mandatory before public international launch.

### Desktop app behavior

Use:

- App display in Czech market: `Časomíra`
- App display internationally: `Casomira`
- Executable/artifacts: `Casomira`
- Package/repo/internal IDs: `casomira`
- Descriptor: `Casomira Timing`

This matches the current implementation better than a full rename.

## Strongest Clean-Sheet Alternative

### Gatepost

If the goal is a fully English, metaphor-first name with less Czech dependency, the best clean-sheet candidate is **Gatepost**.

Origin story:

> A timing system lives at the gate: start gate, finish gate, checkpoint gate. The post is the official position where the event is observed, marked, and recorded.

Why it works:

- real word
- concrete and drawable
- two syllables
- strong track-side image
- expands from timing into race operations

Why it loses to Casomira:

- existing `getgatepost.com` field-software conflict
- weaker domestic Czech fit
- no existing brand equity in this repo
- less directly tied to timekeeping

## Final Decision

Do not rename away from Casomira unless the legal/domain check kills it.

The better move is:

1. Treat **Casomira** as the canonical product name.
2. Keep **Časomíra** as Czech display/local language.
3. Use **Casomira Timing** as the descriptive product line.
4. Secure a clean domain strategy.
5. Only consider **Gatepost** if a true international rebrand becomes necessary.

