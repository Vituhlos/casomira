/* m_intro.jsx — Správce závodů (launcher) + Nový závod (macOS) */

const { useState: useMI } = React;

function Intro({ onOpen }) {
  const [modal, setModal] = useMI(false);
  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--content-bg)" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "30px 26px 52px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, letterSpacing: "-0.025em" }}>Závody</h1>
            <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--text-2)" }}>Vyber závod a pokračuj v časoměřičství, nebo založ nový.</p>
          </div>
          <Btn variant="primary" size="lg" icon="plus" onClick={() => setModal(true)}>Nový závod</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 14 }}>
          {RACES.map((r) => <RaceCard key={r.id} r={r} onOpen={onOpen} />)}
        </div>
      </div>
      {modal && <NewRace onClose={() => setModal(false)} onCreate={(r) => { setModal(false); onOpen(r); }} />}
    </div>
  );
}

function RaceCard({ r, onOpen }) {
  const [h, setH] = useMI(false);
  const live = r.status === "Probíhá";
  return (
    <button onClick={() => onOpen(r)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ textAlign: "left", background: "var(--card)", border: "0.5px solid var(--hairline)", borderRadius: "var(--r-card)",
        padding: 0, cursor: "pointer", overflow: "hidden", boxShadow: h ? "0 6px 20px rgba(0,0,0,0.13)" : "var(--shadow-card)", transition: "box-shadow .15s, transform .15s", transform: h ? "translateY(-1px)" : "none" }}>
      <div style={{ padding: "15px 17px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", height: 21, padding: "0 8px", borderRadius: "var(--r-pill)", fontSize: 11, fontWeight: 510, background: "var(--hover)", color: "var(--text-2)" }}>{r.format}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: live ? "var(--accent-text)" : "var(--text-3)" }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: live ? "var(--accent)" : "var(--text-3)" }} />{r.status}
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 650, letterSpacing: "-0.015em", marginBottom: 2 }}>{r.name}</div>
        <div className="tnum" style={{ fontSize: 12, color: "var(--text-3)" }}>{r.venue} · {r.date}</div>
      </div>
      <div style={{ display: "flex", borderTop: "0.5px solid var(--divider)" }}>
        <div style={{ flex: 1, padding: "9px 17px", borderRight: "0.5px solid var(--divider)" }}>
          <div className="tnum" style={{ fontSize: 16, fontWeight: 620 }}>{r.cats}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>kategorií</div>
        </div>
        <div style={{ flex: 1, padding: "9px 17px" }}>
          <div className="tnum" style={{ fontSize: 16, fontWeight: 620 }}>{r.drivers}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>jezdců</div>
        </div>
      </div>
    </button>
  );
}

function NewRace({ onClose, onCreate }) {
  const [step, setStep] = useMI(1);
  const [fmt, setFmt] = useMI(null);
  const [cat, setCat] = useMI("n1600");
  const [name, setName] = useMI("");
  const formats = [
    { id: "rac", name: "RAC Race", desc: "Klasický autokros — 3× kvalifikace, semifinále, finále." },
    { id: "rx", name: "RX Cup", desc: "Rallycross — Q1–Q3, semifinále, finále A/B." },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "var(--smoke)", backdropFilter: "blur(1px)", display: "grid", placeItems: "center", zIndex: 60, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxWidth: "100%", background: "var(--window)", borderRadius: 14, border: "0.5px solid var(--hairline)", boxShadow: "var(--shadow-win)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "15px 20px", borderBottom: "0.5px solid var(--hairline)", position: "relative" }}>
          <span style={{ fontSize: 14, fontWeight: 620 }}>Nový závod</span>
          <div style={{ position: "absolute", right: 18, display: "flex", gap: 4 }}>{[1, 2].map((s) => <span key={s} style={{ width: 18, height: 3, borderRadius: 99, background: step >= s ? "var(--accent)" : "var(--hairline)" }} />)}</div>
        </div>
        <div style={{ padding: 20 }}>
          {step === 1 && <>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 10 }}>Typ závodu</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {formats.map((f) => { const on = fmt === f.id; return (
                <button key={f.id} onClick={() => setFmt(f.id)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 9, cursor: "pointer",
                  border: `1px solid ${on ? "var(--accent)" : "var(--ctrl-stroke)"}`, background: on ? "color-mix(in srgb, var(--accent) 8%, var(--window))" : "var(--card)", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 99, border: `2px solid ${on ? "var(--accent)" : "var(--ctrl-stroke)"}`, display: "grid", placeItems: "center", flexShrink: 0 }}>{on && <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--accent)" }} />}</span>
                  <span><div style={{ fontSize: 13.5, fontWeight: 590 }}>{f.name}</div><div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>{f.desc}</div></span>
                </button>
              ); })}
            </div>
          </>}
          {step === 2 && <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 7 }}>Název závodu</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="např. MČR Autocross — Přerov"
                style={{ width: "100%", height: 34, padding: "0 11px", borderRadius: 7, border: "0.5px solid var(--ctrl-stroke)", background: "var(--ctrl-bg)", font: "inherit", fontSize: 13, color: "var(--text-1)", outline: "none" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3.5px color-mix(in srgb, var(--accent) 28%, transparent)"; }} onBlur={(e) => { e.target.style.borderColor = "var(--ctrl-stroke)"; e.target.style.boxShadow = "none"; }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 9 }}>Kategorie</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {CATEGORIES.map((c) => { const on = cat === c.id; return (
                <button key={c.id} onClick={() => setCat(c.id)} style={{ height: 30, padding: "0 12px", borderRadius: "var(--r-pill)", cursor: "pointer", font: "inherit", fontSize: 12.5, fontWeight: on ? 590 : 450,
                  border: `0.5px solid ${on ? "var(--accent)" : "var(--ctrl-stroke)"}`, background: on ? "var(--accent)" : "var(--card)", color: on ? "#fff" : "var(--text-2)" }}>{c.label}</button>
              ); })}
            </div>
          </>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, padding: "13px 20px", borderTop: "0.5px solid var(--hairline)" }}>
          <Btn variant="bezel" onClick={step === 1 ? onClose : () => setStep(1)}>{step === 1 ? "Zrušit" : "Zpět"}</Btn>
          {step === 1 ? <Btn variant="primary" disabled={!fmt} onClick={() => fmt && setStep(2)}>Pokračovat</Btn>
                      : <Btn variant="primary" onClick={() => onCreate({ id: "new", name: name || "Nový závod", date: RACE_META.date, cat })}>Založit závod</Btn>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Intro });
