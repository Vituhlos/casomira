/* data.jsx — datový model časoměřičské aplikace (čeština) */

// ---- Kategorie (levý panel) ----
const CATEGORIES = [
  { id: "junior", label: "Junior" },
  { id: "n1400", label: "N1400" },
  { id: "n1600", label: "N1600" },
  { id: "n1600p", label: "N1600+" },
  { id: "s1600", label: "S1600" },
  { id: "s1600p", label: "S1600+" },
  { id: "tuning", label: "Tuning" },
  { id: "skoda", label: "Škoda Cup" },
  { id: "cross", label: "Cross Cup" },
  { id: "damsky", label: "Dámský pohár" },
  { id: "sotolina", label: "Šotolina" },
];

// počet přihlášených (jen pro vizuální kontext v panelu)
const CATEGORY_COUNTS = {
  n1600: 16, n1400: 12, junior: 9, "n1600p": 14, s1600: 11,
  "s1600p": 8, tuning: 7, skoda: 18, cross: 13, damsky: 6, sotolina: 15,
};

// ---- Fáze (horní lišta záložek) ----
const PHASES = [
  { id: "start", label: "Startovní listina", short: "Start. listina", group: "základ" },
  { id: "grid_q1", label: "Rošty Q1", short: "Rošty Q1", group: "Q1" },
  { id: "res_q1", label: "Výsledky Q1", short: "Výsledky Q1", group: "Q1" },
  { id: "grid_q2", label: "Rošty Q2", short: "Rošty Q2", group: "Q2" },
  { id: "res_q2", label: "Výsledky Q2", short: "Výsledky Q2", group: "Q2" },
  { id: "class_q2", label: "Klasifikace po Q2", short: "Klas. po Q2", group: "Q2" },
  { id: "grid_q3", label: "Rošty Q3", short: "Rošty Q3", group: "Q3" },
  { id: "res_q3", label: "Výsledky Q3", short: "Výsledky Q3", group: "Q3" },
  { id: "class_q3", label: "Klasifikace po Q3", short: "Klas. po Q3", group: "Q3" },
  { id: "sf", label: "Semifinále", short: "Semifinále", group: "závěr" },
  { id: "final", label: "Finále", short: "Finále", group: "závěr" },
  { id: "overall", label: "Celkově", short: "Celkově", group: "závěr" },
];

// ---- Bodový žebříček dle pořadí ----
// 1.→50, 2.→45, 3.→42, 4.→40, dále 44−pořadí (5.→39, 6.→38, …)
function pointsFor(position) {
  if (position === 1) return 50;
  if (position === 2) return 45;
  if (position === 3) return 42;
  return Math.max(0, 44 - position);
}

// ---- Roster aktivní kategorie (N1600) ----
// id, los (losované pořadí), num (startovní číslo), surname, name, brand, model
const ROSTER = [
  { id: 1, los: 54, num: 11, surname: "Šaroun", name: "Adam", brand: "Volkswagen", model: "Lupo" },
  { id: 2, los: 25, num: 94, surname: "Lagron", name: "Jaroslav", brand: "Peugeot", model: "306" },
  { id: 3, los: 65, num: 779, surname: "Bartuška", name: "Stanislav", brand: "Peugeot", model: "206" },
  { id: 4, los: 46, num: 93, surname: "Ladra", name: "Štěpán", brand: "Škoda", model: "Favorit" },
  { id: 5, los: 32, num: 197, surname: "Vnouček", name: "Franta", brand: "Peugeot", model: "206" },
  { id: 6, los: 8, num: 7, surname: "Novák", name: "Petr", brand: "Škoda", model: "Fabia" },
  { id: 7, los: 17, num: 41, surname: "Dvořák", name: "Martin", brand: "Citroën", model: "Saxo" },
  { id: 8, los: 39, num: 55, surname: "Procházka", name: "Tomáš", brand: "Peugeot", model: "205" },
  { id: 9, los: 71, num: 23, surname: "Kučera", name: "Lukáš", brand: "Škoda", model: "Felicia" },
  { id: 10, los: 12, num: 88, surname: "Veselý", name: "Jan", brand: "Renault", model: "Clio" },
  { id: 11, los: 50, num: 12, surname: "Horák", name: "Pavel", brand: "Volkswagen", model: "Polo" },
  { id: 12, los: 28, num: 64, surname: "Němec", name: "David", brand: "Opel", model: "Corsa" },
  { id: 13, los: 4, num: 3, surname: "Pokorný", name: "Radek", brand: "Škoda", model: "Favorit" },
  { id: 14, los: 60, num: 71, surname: "Marek", name: "Ondřej", brand: "Peugeot", model: "106" },
  { id: 15, los: 19, num: 28, surname: "Beneš", name: "Jiří", brand: "Ford", model: "Fiesta" },
  { id: 16, los: 43, num: 5, surname: "Král", name: "Michal", brand: "Citroën", model: "C2" },
];

const byNum = {};
ROSTER.forEach((d) => (byNum[d.num] = d));
function driverByNum(num) { return byNum[num] || null; }
function driverById(id) { return ROSTER.find((d) => d.id === id) || null; }

// ---- Výsledky kvalifikací ----
// ms = čas v milisekundách; status: null | "DNF" | "DNS" | "DQ"
// uloženo jako pořadí (index = pořadí−1), body se počítají z pozice
const RES_Q1 = [
  { id: 1, ms: 210630 },          // Šaroun 03:30.630
  { id: 2, ms: 216274 },          // Lagron 03:36.274
  { id: 3, ms: 216686 },          // Bartuška 03:36.686
  { id: 4, ms: 225147 },          // Ladra 03:45.147
  { id: 5, ms: null, status: "DNF" }, // Vnouček DNF
  { id: 6, ms: 219210 },
  { id: 8, ms: 221880 },
  { id: 7, ms: 223502 },
  { id: 10, ms: 227119 },
  { id: 9, ms: 229640 },
  { id: 11, ms: 232087 },
  { id: 13, ms: 234760 },
  { id: 14, ms: 238330 },
  { id: 15, ms: 242910 },
  { id: 16, ms: 246550 },
  { id: 12, ms: null, status: "DNS" },
];

const RES_Q2_ORDER = [2, 1, 4, 3, 8, 6, 10, 7, 5, 11, 9, 14, 13, 16, 15, 12];
const RES_Q3_ORDER = [1, 2, 3, 8, 4, 10, 6, 11, 7, 5, 14, 9, 16, 13, 12, 15];
// dummy statusy pro Q3
const RES_Q3_STATUS = { 15: "DNF" };

function buildOrderResults(order, statusMap) {
  return order.map((id) => ({ id, ms: null, status: statusMap && statusMap[id] ? statusMap[id] : null }));
}
const RES_Q2 = buildOrderResults(RES_Q2_ORDER, {});
const RES_Q3 = buildOrderResults(RES_Q3_ORDER, RES_Q3_STATUS);

// body za jednu kvalifikaci -> mapa id->body
function phasePoints(resArr) {
  const map = {};
  resArr.forEach((r, i) => {
    const pos = i + 1;
    map[r.id] = (r.status === "DNS" || r.status === "DQ") ? 0 : pointsFor(pos);
  });
  return map;
}

// ---- Klasifikace (součet kvalifikací) ----
function standings(phases /* ['q1','q2','q3'] */) {
  const arrs = { q1: RES_Q1, q2: RES_Q2, q3: RES_Q3 };
  const pts = {}; phases.forEach((p) => (pts[p] = phasePoints(arrs[p])));
  const rows = ROSTER.map((d) => {
    const per = {}; let total = 0;
    phases.forEach((p) => { per[p] = pts[p][d.id] ?? 0; total += per[p]; });
    return { ...d, per, total };
  });
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

// ---- Rošty Q1 (rozdělení do jízd) ----
// brief: každá jízda až 8 pozic; operátor zadá jen startovní číslo
const GRID_Q1 = [
  { heat: "1. JÍZDA", nums: [11, 94, 779, 93, 197, 7, 41, 55] },
  { heat: "2. JÍZDA", nums: [23, 88, 12, 64, 3, 71, 28, 5] },
];

// ---- Finále ----
// pořadí ve finále (id) + bonusové body Q + SF + F
const FINAL_ORDER = [1, 2, 3, 8, 4, 10];
const SF_POINTS = { 1: 16, 2: 15, 3: 14, 8: 13, 4: 12, 10: 11, 6: 10, 7: 9 };

// ---- Závody (úvodní obrazovka) ----
const RACES = [
  { id: "r1", name: "MČR Autocross — Přerov", venue: "Přerov", date: "30. 5. 2026", format: "RAC Race", cats: 11, drivers: 139, status: "Probíhá" },
  { id: "r2", name: "Rallycross Sosnová", venue: "Sosnová", date: "17. 5. 2026", format: "RX Cup", cats: 6, drivers: 84, status: "Dokončeno" },
  { id: "r3", name: "Šotolina Cup — Humpolec", venue: "Humpolec", date: "3. 5. 2026", format: "Šotolina Cup", cats: 4, drivers: 52, status: "Dokončeno" },
  { id: "r4", name: "Autocross Nová Paka", venue: "Nová Paka", date: "12. 4. 2026", format: "RAC Race", cats: 9, drivers: 118, status: "Dokončeno" },
];

const RACE_FORMATS = [
  { id: "rac", name: "RAC Race", desc: "Klasický autokros — 3× kvalifikace, semifinále, finále." },
  { id: "rx", name: "RX Cup", desc: "Rallycrossový pohár — Q1–Q3, semifinále, finále A/B." },
  { id: "sotolina", name: "Šotolina Cup", desc: "Šotolinový seriál — zjednodušený formát Q1–Q2, finále." },
];

const RACE_META = { name: "MČR Autocross — Přerov", date: "30. 5. 2026" };

// ---- Formátování času ----
function fmtTime(ms) {
  if (ms == null) return "";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mil = ms % 1000;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(mil).padStart(3, "0")}`;
}
function fmtClock(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

Object.assign(window, {
  CATEGORIES, CATEGORY_COUNTS, PHASES, ROSTER, RACES, RACE_FORMATS, RACE_META,
  GRID_Q1, RES_Q1, RES_Q2, RES_Q3, FINAL_ORDER, SF_POINTS,
  pointsFor, phasePoints, standings, driverByNum, driverById, fmtTime, fmtClock,
});
