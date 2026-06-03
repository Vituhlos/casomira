/* m_app.jsx — kořen macOS aplikace: floating okno + traffic lights + routing + Tweaks */

const { useState: useMA, useEffect: useEMA } = React;

const M_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "zebra": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(M_DEFAULTS);
  const [race, setRace] = useMA(null);
  const [cat, setCat] = useMA("n1600");
  const [phase, setPhase] = useMA("start");
  const [stopwatch, setStopwatch] = useMA(false);
  const [roster, setRoster] = useMA(ROSTER);

  useEMA(() => { document.documentElement.dataset.theme = t.theme || "light"; }, [t.theme]);

  const openRace = (r) => { if (r && r.cat) setCat(r.cat); setRace(r || { name: RACE_META.name }); setPhase("start"); setStopwatch(false); };
  const zebra = t.zebra;

  const Panel = (
    <TweaksPanel>
      <TweakSection label="Vzhled" />
      <TweakRadio label="Režim" value={t.theme} options={[{ value: "light", label: "Světlý" }, { value: "dark", label: "Tmavý" }]} onChange={(v) => setTweak("theme", v)} />
      <TweakToggle label="Pruhování řádků" value={t.zebra} onChange={(v) => setTweak("zebra", v)} />
    </TweaksPanel>
  );

  let inner;
  if (!race) {
    inner = (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* unified titlebar pro launcher */}
        <div className="no-print" style={{ height: "var(--toolbar-h)", flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 16px", background: "var(--toolbar)", backdropFilter: "blur(50px) saturate(1.8)", WebkitBackdropFilter: "blur(50px) saturate(1.8)", borderBottom: "0.5px solid var(--hairline)" }}>
          <TrafficLights />
          <span style={{ fontSize: 13.5, fontWeight: 600, marginLeft: 4 }}>Časomíra</span>
          <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>Správce závodů</span>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}><Intro onOpen={openRace} /></div>
      </div>
    );
  } else {
    let content;
    if (stopwatch) content = <Stopwatch roster={roster} />;
    else switch (phase) {
      case "start": content = <StartList roster={roster} setRoster={setRoster} zebra={zebra} />; break;
      case "grid_q1": case "grid_q2": case "grid_q3": content = <Grids roster={roster} zebra={zebra} />; break;
      case "res_q1": case "res_q2": case "res_q3": case "sf": content = <Results roster={roster} zebra={zebra} />; break;
      case "class_q2": content = <Standings phases={["q1", "q2"]} title="Klasifikace po Q2" zebra={zebra} />; break;
      case "class_q3": content = <Standings phases={["q1", "q2", "q3"]} title="Klasifikace po Q3" zebra={zebra} />; break;
      case "final": content = <Overall mode="final" zebra={zebra} />; break;
      case "overall": content = <Overall mode="overall" zebra={zebra} />; break;
      default: content = <StartList roster={roster} setRoster={setRoster} zebra={zebra} />;
    }
    const catLabel = (CATEGORIES.find((c) => c.id === cat) || {}).label || "";
    const phaseLabel = stopwatch ? "Stopky" : (PHASES.find((p) => p.id === phase) || {}).label;

    inner = (
      <div style={{ display: "flex", height: "100%" }}>
        <Sidebar activeCat={cat} onCat={(c) => { setCat(c); setStopwatch(false); }} onHome={() => setRace(null)} />
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "var(--content-bg)" }}>
          {/* unified toolbar: traffic lights jsou v sidebaru; tady breadcrumb + akce */}
          <Toolbar catLabel={catLabel} phaseLabel={phaseLabel} stopwatch={stopwatch} onStopwatch={() => setStopwatch((s) => !s)} onPdf={() => window.print()} />
          {!stopwatch && <Segmented active={phase} onTab={(p) => { setPhase(p); setStopwatch(false); }} />}
          <div style={{ flex: 1, minHeight: 0, overflowY: stopwatch ? "hidden" : "auto" }}>{content}</div>
        </main>
      </div>
    );
  }

  // traffic lights pro režim se sidebarem (sedí nad sidebarem)
  const showLights = !!race;

  return (
    <div style={{ position: "fixed", inset: 0, padding: 22, display: "flex" }}>
      <div style={{ flex: 1, position: "relative", borderRadius: "var(--r-win)", overflow: "hidden", background: "var(--window)", boxShadow: "var(--shadow-win)", border: "0.5px solid rgba(0,0,0,0.18)" }}>
        {showLights && <div className="no-print" style={{ position: "absolute", top: 19, left: 16, zIndex: 20 }}><TrafficLights /></div>}
        {inner}
      </div>
      {Panel}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
