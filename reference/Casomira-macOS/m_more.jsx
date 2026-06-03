/* m_more.jsx — Klasifikace, Finále/Celkově, Stopky (macOS) */

const { useState: useMM, useEffect: useEMM, useRef: useRMM } = React;

// ---------- KLASIFIKACE ----------
function Standings({ phases, title, zebra }) {
  const [rows, setRows] = useMM(() => standings(phases));
  const doSort = () => setRows([...standings(phases)]);
  return (
    <div className="screen-enter">
      <ContentHead title={title} sub={`Průběžné pořadí · součet bodů ${phases.map((p) => p.toUpperCase()).join(" + ")}`}>
        <Btn variant="primary" icon="sort" onClick={doSort}>Seřadit</Btn>
      </ContentHead>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup><col style={{ width: 58 }} /><col style={{ width: 80 }} /><col />{phases.map((p) => <col key={p} style={{ width: 80 }} />)}<col style={{ width: 104 }} /></colgroup>
          <thead><tr>
            <th style={mth}>Pořadí</th><th style={mth}>St. č.</th><th style={mth}>Jezdec</th>
            {phases.map((p) => <th key={p} style={{ ...mth, textAlign: "right" }}>{p.toUpperCase()}</th>)}
            <th style={{ ...mth, textAlign: "right" }}>Celkem</th>
          </tr></thead>
          <tbody>
            {rows.map((d, i) => {
              const pos = i + 1;
              return (
                <Row key={d.id} i={i} zebra={zebra}>
                  <td style={{ ...mtd, fontVariantNumeric: "tabular-nums", fontWeight: 620, fontSize: 13, color: pos <= 3 ? "var(--text-1)" : "var(--text-2)" }}><Medal rank={pos} />{pos}.</td>
                  <td style={mtd}><span className="tnum" style={{ fontWeight: 600 }}>{d.num}</span></td>
                  <td style={mtd}><b style={{ fontWeight: 590 }}>{d.surname}</b> <span style={{ color: "var(--text-2)" }}>{d.name}</span></td>
                  {phases.map((p) => <td key={p} style={{ ...mtd, textAlign: "right" }}><span className="tnum" style={{ color: "var(--text-3)" }}>{d.per[p]}</span></td>)}
                  <td style={{ ...mtd, textAlign: "right" }}><span className="tnum" style={{ fontWeight: 660, fontSize: 14 }}>{d.total}</span></td>
                </Row>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------- FINÁLE / CELKOVĚ ----------
function Overall({ mode, zebra }) {
  const qRows = standings(["q1", "q2", "q3"]); const qMap = {}; qRows.forEach((r) => (qMap[r.id] = r.total));
  const fBonus = [25, 22, 20, 18, 17, 16]; const fb = {}; FINAL_ORDER.forEach((id, i) => (fb[id] = fBonus[i] || 0));
  let rows = ROSTER.map((d) => { const q = qMap[d.id] || 0, sf = SF_POINTS[d.id] || 0, f = fb[d.id] || 0; return { ...d, q, sf, f, total: q + sf + f }; }).sort((a, b) => b.total - a.total);
  if (mode === "final") rows = FINAL_ORDER.map((id, i) => { const d = driverById(id); return { ...d, q: qMap[id] || 0, sf: SF_POINTS[id] || 0, f: fBonus[i] || 0, total: (qMap[id] || 0) + (SF_POINTS[id] || 0) + (fBonus[i] || 0) }; });
  const title = mode === "final" ? "Finále" : "Celkové pořadí";
  const sub = mode === "final" ? "Pořadí ve finálové jízdě · body Q + SF + F" : "Konečné pořadí kategorie · součet Q + semifinále + finále";
  return (
    <div className="screen-enter">
      <ContentHead title={title} sub={sub}><Btn variant="primary" icon="trophy">Vyhlásit</Btn></ContentHead>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <colgroup><col style={{ width: 62 }} /><col style={{ width: 80 }} /><col /><col style={{ width: "17%" }} /><col style={{ width: 72 }} /><col style={{ width: 72 }} /><col style={{ width: 72 }} /><col style={{ width: 104 }} /></colgroup>
          <thead><tr>
            <th style={mth}>Pořadí</th><th style={mth}>St. č.</th><th style={mth}>Jezdec</th><th style={mth}>Vůz</th>
            <th style={{ ...mth, textAlign: "right" }}>Q</th><th style={{ ...mth, textAlign: "right" }}>SF</th><th style={{ ...mth, textAlign: "right" }}>F</th><th style={{ ...mth, textAlign: "right" }}>Celkem</th>
          </tr></thead>
          <tbody>
            {rows.map((d, i) => {
              const pos = i + 1, medal = { 1: "#d8a32b", 2: "#9ba0a6", 3: "#bd7b43" }[pos];
              return (
                <tr key={d.id} style={{ background: medal ? `color-mix(in srgb, ${medal} 8%, var(--card))` : (zebra && i % 2 ? "var(--card-alt)" : "transparent") }}>
                  <td style={{ ...mtd, height: 46, fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 14, color: medal || "var(--text-2)" }}><Medal rank={pos} />{pos}.</td>
                  <td style={{ ...mtd, height: 46 }}><span className="tnum" style={{ fontWeight: 600 }}>{d.num}</span></td>
                  <td style={{ ...mtd, height: 46, fontSize: pos <= 3 ? 13.5 : 13 }}><b style={{ fontWeight: pos <= 3 ? 660 : 590 }}>{d.surname}</b> <span style={{ color: "var(--text-2)" }}>{d.name}</span></td>
                  <td style={{ ...mtd, height: 46, color: "var(--text-3)" }}>{d.brand} {d.model}</td>
                  <td style={{ ...mtd, height: 46, textAlign: "right" }}><span className="tnum" style={{ color: "var(--text-3)" }}>{d.q}</span></td>
                  <td style={{ ...mtd, height: 46, textAlign: "right" }}><span className="tnum" style={{ color: "var(--text-3)" }}>{d.sf}</span></td>
                  <td style={{ ...mtd, height: 46, textAlign: "right" }}><span className="tnum" style={{ color: "var(--text-3)" }}>{d.f}</span></td>
                  <td style={{ ...mtd, height: 46, textAlign: "right" }}><span className="tnum" style={{ fontWeight: 720, fontSize: 15 }}>{d.total}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ---------- STOPKY ----------
function Stopwatch({ roster }) {
  const [running, setRunning] = useMM(false);
  const [elapsed, setElapsed] = useMM(0);
  const [laps, setLaps] = useMM([]);
  const startRef = useRMM(0), rafRef = useRMM(0);
  useEMM(() => {
    if (!running) return;
    const tick = () => { setElapsed(performance.now() - startRef.current); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);
  const start = () => { startRef.current = performance.now() - elapsed; setRunning(true); };
  const record = () => { if (running) setLaps((l) => [{ t: Date.now() + Math.random(), ms: elapsed, num: "" }, ...l]); };
  const undo = () => setLaps((l) => l.slice(1));
  const reset = () => { setRunning(false); setElapsed(0); setLaps([]); };
  const assign = (idx, num) => setLaps((l) => l.map((x, i) => i === idx ? { ...x, num } : x));
  useEMM(() => {
    const onKey = (e) => {
      if (e.code === "Space" && e.target.tagName !== "INPUT") { e.preventDefault(); running ? record() : start(); }
      if (e.code === "Backspace" && e.target.tagName !== "INPUT") { e.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, elapsed]);
  const byN = {}; roster.forEach((d) => (byN[d.num] = d));
  return (
    <div className="screen-enter" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", height: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 36, borderRight: "0.5px solid var(--hairline)", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 590, color: running ? "var(--accent-text)" : "var(--text-3)" }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: running ? "var(--accent)" : "var(--text-3)" }} />
          {running ? "Měření běží" : elapsed > 0 ? "Pozastaveno" : "Připraveno"}
        </div>
        <div className="tnum" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(58px,10vw,118px)", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 0.95 }}>{fmtClock(elapsed)}</div>
        <button onClick={record} disabled={!running}
          style={{ width: 290, height: 116, borderRadius: 18, border: "none", cursor: running ? "pointer" : "default",
            background: running ? "var(--accent)" : "var(--ctrl-bg)", color: running ? "#fff" : "var(--text-3)",
            fontSize: 24, fontWeight: 620, letterSpacing: "0.01em", boxShadow: running ? "0 8px 24px color-mix(in srgb, var(--accent) 40%, transparent)" : "var(--shadow-btn)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, transition: "transform .06s" }}
          onMouseDown={(e) => running && (e.currentTarget.style.transform = "scale(0.98)")} onMouseUp={(e) => (e.currentTarget.style.transform = "none")} onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
          ZAZNAMENAT<span style={{ fontSize: 12, fontWeight: 450, opacity: 0.8 }}>mezerník</span>
        </button>
        <div style={{ display: "flex", gap: 9 }}>
          {!running ? <Btn variant="primary" size="lg" icon="play" onClick={start}>{elapsed > 0 ? "Pokračovat" : "Start"}</Btn> : <Btn size="lg" icon="pause" onClick={() => setRunning(false)}>Pauza</Btn>}
          <Btn size="lg" icon="undo" onClick={undo}>Vrátit poslední</Btn>
          <Btn size="lg" variant="plain" icon="reset" onClick={reset}>Vynulovat</Btn>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", background: "var(--window)", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderBottom: "0.5px solid var(--hairline)" }}>
          <span style={{ fontSize: 13.5, fontWeight: 620 }}>Zaznamenané časy</span>
          <span className="tnum" style={{ fontSize: 12, color: "var(--text-3)" }}>{laps.length} záznamů</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {laps.length === 0 && <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>Zatím nic nezaznamenáno.<br />Stiskni <b style={{ color: "var(--text-2)" }}>mezerník</b> nebo ZAZNAMENAT.</div>}
          {laps.map((lap, i) => {
            const n = laps.length - i, d = lap.num ? byN[parseInt(lap.num, 10)] : null;
            return (
              <div key={lap.t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 54, borderBottom: "0.5px solid var(--divider)", background: i === 0 ? "color-mix(in srgb, var(--accent) 9%, transparent)" : "transparent" }}>
                <span className="tnum" style={{ width: 22, color: "var(--text-3)", fontSize: 12 }}>{String(n).padStart(2, "0")}</span>
                <span className="tnum" style={{ fontSize: 19, fontWeight: 590, letterSpacing: "-0.02em" }}>{fmtClock(lap.ms)}</span>
                <div style={{ flex: 1 }} />
                <input value={lap.num} onChange={(e) => assign(i, e.target.value.replace(/\D/g, ""))} placeholder="č."
                  style={{ width: 54, height: 30, textAlign: "center", border: "0.5px solid var(--ctrl-stroke)", borderRadius: 6, background: "var(--ctrl-bg)", font: "inherit", fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: "var(--text-1)", outline: "none" }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3.5px color-mix(in srgb, var(--accent) 28%, transparent)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--ctrl-stroke)"; e.target.style.boxShadow = "none"; }} />
                <span style={{ width: 136, fontSize: 12.5, color: d ? "var(--text-2)" : "var(--text-4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d ? <><b style={{ color: "var(--text-1)", fontWeight: 590 }}>{d.surname}</b> {d.name}</> : "nepřiřazeno"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Standings, Overall, Stopwatch });
