/* m_screens.jsx — macOS inset tabulky + Startovní listina, Rošty Q1, Výsledky Q1 */

const { useState: useMC, useEffect: useEMC } = React;

// ---------- inset table primitivy ----------
function Card({ children, style }) {
  return (
    <div style={{ margin: "0 22px 22px", background: "var(--card)", border: "0.5px solid var(--hairline)",
      borderRadius: "var(--r-card)", overflow: "hidden", boxShadow: "var(--shadow-card)", ...style }}>{children}</div>
  );
}

const mth = {
  position: "sticky", top: 0, zIndex: 1, textAlign: "left", padding: "0 14px", height: 32,
  background: "var(--card)", borderBottom: "0.5px solid var(--hairline)", color: "var(--text-3)",
  fontSize: 11.5, fontWeight: 510, whiteSpace: "nowrap",
};
const mtd = { padding: "0 14px", height: 38, borderBottom: "0.5px solid var(--divider)", fontSize: 13, color: "var(--text-1)", verticalAlign: "middle" };

function Row({ children, i, zebra }) {
  const [h, setH] = useMC(false);
  return (
    <tr onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: h ? "var(--hover)" : (zebra && i % 2 ? "var(--card-alt)" : "transparent") }}>{children}</tr>
  );
}

function Cell({ value, onChange, align = "left", num, placeholder, weight }) {
  const [v, setV] = useMC(value);
  useEMC(() => setV(value), [value]);
  return (
    <input value={v ?? ""} placeholder={placeholder}
      onChange={(e) => setV(e.target.value)} onBlur={() => onChange && onChange(v)}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      style={{ width: "100%", border: "1px solid transparent", background: "transparent", padding: "5px 7px", margin: "0 -7px",
        borderRadius: 5, font: "inherit", fontSize: 13, fontVariantNumeric: num ? "tabular-nums" : "normal", textAlign: align,
        color: "var(--text-1)", fontWeight: weight || 400, outline: "none", boxSizing: "border-box" }}
      onFocus={(e) => { e.target.style.background = "var(--window)"; e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3.5px color-mix(in srgb, var(--accent) 28%, transparent)"; }}
      onBlurCapture={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = "transparent"; e.target.style.boxShadow = "none"; }} />
  );
}

function parseTime(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2}):(\d{2})\.(\d{1,3})$/);
  return m ? (+m[1]) * 60000 + (+m[2]) * 1000 + (+m[3].padEnd(3, "0")) : null;
}

// ---------- STARTOVNÍ LISTINA ----------
function StartList({ roster, setRoster, zebra }) {
  const sorted = [...roster].sort((a, b) => (a.los || 999) - (b.los || 999));
  const upd = (id, k, val) => setRoster(roster.map((d) => d.id === id ? { ...d, [k]: (k === "los" || k === "num") ? (parseInt(val, 10) || "") : val } : d));
  const add = () => setRoster([...roster, { id: Date.now(), los: "", num: "", surname: "", name: "", brand: "", model: "" }]);
  const cols = [
    { k: "los", h: "Los", w: 70, num: true }, { k: "num", h: "St. číslo", w: 94, num: true, weight: 600 },
    { k: "surname", h: "Příjmení", w: "19%", weight: 590 }, { k: "name", h: "Jméno", w: "19%" },
    { k: "brand", h: "Značka", w: "19%" }, { k: "model", h: "Model", w: "19%" },
  ];
  return (
    <div className="screen-enter">
      <ContentHead title="Startovní listina" sub={`${roster.length} přihlášených · řazeno dle losu`}>
        <Btn icon="import">Importovat z Excelu</Btn>
        <Btn variant="primary" icon="plus" onClick={add}>Přidat jezdce</Btn>
      </ContentHead>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup>{cols.map((c) => <col key={c.k} style={{ width: c.w }} />)}</colgroup>
          <thead><tr>{cols.map((c) => <th key={c.k} style={mth}>{c.h}</th>)}</tr></thead>
          <tbody>
            {sorted.map((d, i) => (
              <Row key={d.id} i={i} zebra={zebra}>
                {cols.map((c) => <td key={c.k} style={mtd}><Cell value={d[c.k]} num={c.num} weight={c.weight} onChange={(val) => upd(d.id, c.k, val)} /></td>)}
              </Row>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------- ROŠTY Q1 ----------
function Grids({ roster, zebra }) {
  const [grid, setGrid] = useMC(() => GRID_Q1.map((h) => ({ heat: h.heat, slots: [...h.nums, ...Array(8 - h.nums.length).fill("")] })));
  const byN = {}; roster.forEach((d) => (byN[d.num] = d));
  const setSlot = (hi, si, val) => { const n = parseInt(val, 10); setGrid(grid.map((h, i) => i === hi ? { ...h, slots: h.slots.map((s, j) => j === si ? (Number.isNaN(n) ? "" : n) : s) } : h)); };
  return (
    <div className="screen-enter">
      <ContentHead title="Rošty — Q1" sub="Zadej startovní číslo · jméno a vůz se doplní automaticky">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-3)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--card-alt)", border: "0.5px solid var(--hairline)" }} />odvozená pole
        </span>
      </ContentHead>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 16, padding: "0 22px 22px" }}>
        {grid.map((h, hi) => (
          <div key={hi} style={{ background: "var(--card)", border: "0.5px solid var(--hairline)", borderRadius: "var(--r-card)", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 15px", borderBottom: "0.5px solid var(--hairline)" }}>
              <span style={{ fontSize: 13, fontWeight: 620, letterSpacing: "-0.01em" }}>{h.heat}</span>
              <span className="tnum" style={{ fontSize: 11.5, color: "var(--text-3)" }}>{h.slots.filter((s) => s).length}/8</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup><col style={{ width: 42 }} /><col style={{ width: 72 }} /><col /><col style={{ width: "33%" }} /></colgroup>
              <thead><tr><th style={{ ...mth, height: 28 }}>Poz.</th><th style={{ ...mth, height: 28 }}>Číslo</th><th style={{ ...mth, height: 28 }}>Jezdec</th><th style={{ ...mth, height: 28 }}>Vůz</th></tr></thead>
              <tbody>
                {h.slots.map((num, si) => {
                  const d = num ? byN[num] : null;
                  return (
                    <Row key={si} i={si} zebra={zebra}>
                      <td style={{ ...mtd, height: 38, color: "var(--text-3)", fontVariantNumeric: "tabular-nums", fontSize: 12.5 }}>{si + 1}</td>
                      <td style={{ ...mtd, height: 38, padding: "0 9px" }}><Cell value={num} num placeholder="—" weight={600} onChange={(v) => setSlot(hi, si, v)} /></td>
                      <td style={{ ...mtd, height: 38 }}>{d ? <span style={{ color: "var(--text-3)" }}><b style={{ color: "var(--text-2)", fontWeight: 590 }}>{d.surname}</b> {d.name}</span> : <span style={{ color: "var(--text-4)" }}>—</span>}</td>
                      <td style={{ ...mtd, height: 38, color: "var(--text-3)" }}>{d ? `${d.brand} ${d.model}` : <span style={{ color: "var(--text-4)" }}>—</span>}</td>
                    </Row>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- VÝSLEDKY Q1 ----------
function Results({ roster, zebra }) {
  const byId = {}; roster.forEach((d) => (byId[d.id] = d));
  const [res, setRes] = useMC(() => RES_Q1.map((r) => ({ ...r })));
  const setTime = (idx, str) => { const ms = parseTime(str); setRes(res.map((r, i) => i === idx ? { ...r, ms, status: ms != null ? null : r.status } : r)); };
  const cycle = (idx) => { const o = [null, "DNF", "DNS", "DQ"]; setRes(res.map((r, i) => i === idx ? { ...r, status: o[(o.indexOf(r.status) + 1) % o.length], ms: null } : r)); };
  const resort = () => { const r1 = [...res].filter((r) => r.ms != null).sort((a, b) => a.ms - b.ms); setRes([...r1, ...res.filter((r) => r.ms == null)]); };
  return (
    <div className="screen-enter">
      <ContentHead title="Výsledky — Q1" sub="Čas mm:ss.sss · body dle pořadí (50/45/42/40/39…) · dvojklik na čas = DNF/DNS/DQ">
        <Btn icon="sort" onClick={resort}>Seřadit dle času</Btn>
      </ContentHead>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup><col style={{ width: 58 }} /><col style={{ width: 80 }} /><col /><col style={{ width: "15%" }} /><col style={{ width: "14%" }} /><col style={{ width: "12%" }} /><col style={{ width: 132 }} /><col style={{ width: 74 }} /></colgroup>
          <thead><tr>{["Pořadí", "St. č.", "Příjmení", "Jméno", "Značka", "Model", "Čas", "Body"].map((h, i) => <th key={h} style={{ ...mth, textAlign: i >= 6 ? "right" : "left" }}>{h}</th>)}</tr></thead>
          <tbody>
            {res.map((r, i) => {
              const d = byId[r.id]; if (!d) return null;
              const pos = i + 1, pts = (r.status === "DNS" || r.status === "DQ") ? 0 : pointsFor(pos);
              return (
                <Row key={r.id} i={i} zebra={zebra}>
                  <td style={{ ...mtd, fontVariantNumeric: "tabular-nums", fontWeight: 620, fontSize: 13, color: pos <= 3 ? "var(--text-1)" : "var(--text-2)" }}><Medal rank={pos} />{pos}.</td>
                  <td style={mtd}><span className="tnum" style={{ fontWeight: 600 }}>{d.num}</span></td>
                  <td style={{ ...mtd, fontWeight: 590 }}>{d.surname}</td>
                  <td style={{ ...mtd, color: "var(--text-2)" }}>{d.name}</td>
                  <td style={{ ...mtd, color: "var(--text-2)" }}>{d.brand}</td>
                  <td style={{ ...mtd, color: "var(--text-3)" }}>{d.model}</td>
                  <td style={{ ...mtd, textAlign: "right" }}>
                    {r.status ? <span onClick={() => cycle(i)} style={{ cursor: "pointer" }}><Badge status={r.status} /></span>
                      : <input defaultValue={fmtTime(r.ms)} placeholder="mm:ss.sss" onBlur={(e) => setTime(i, e.target.value)} onDoubleClick={() => cycle(i)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                          style={{ width: 110, textAlign: "right", border: "1px solid transparent", background: "transparent", padding: "4px 6px", margin: "0 -6px",
                            borderRadius: 5, font: "inherit", fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--text-1)", fontWeight: 500, outline: "none" }}
                          onFocus={(e) => { e.target.style.background = "var(--window)"; e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3.5px color-mix(in srgb, var(--accent) 28%, transparent)"; }}
                          onBlurCapture={(e) => { e.target.style.background = "transparent"; e.target.style.borderColor = "transparent"; e.target.style.boxShadow = "none"; }} />}
                  </td>
                  <td style={{ ...mtd, textAlign: "right" }}><span className="tnum" style={{ fontWeight: 620, fontSize: 13.5, color: pts ? "var(--text-1)" : "var(--text-3)" }}>{pts}</span></td>
                </Row>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

Object.assign(window, { Card, mth, mtd, Row, Cell, parseTime, StartList, Grids, Results });
