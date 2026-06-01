/* m_shell.jsx — Sidebar (vibrancy) + Unified toolbar + Segmentový přepínač */

const { useState: useMS } = React;

const CAT_ICON = {
  junior: "flag", n1400: "car", n1600: "car", n1600p: "car", s1600: "car",
  s1600p: "car", tuning: "car", skoda: "cup", cross: "flag", damsky: "cup", sotolina: "flag",
};

// ---------- Sidebar ----------
function Sidebar({ activeCat, onCat, onHome }) {
  return (
    <aside style={{
      width: "var(--sidebar-w)", flexShrink: 0, background: "var(--sidebar)",
      backdropFilter: "blur(50px) saturate(1.8)", WebkitBackdropFilter: "blur(50px) saturate(1.8)",
      display: "flex", flexDirection: "column", height: "100%", borderRight: "0.5px solid var(--hairline)",
    }}>
      {/* prázdný prostor pod traffic lights (macOS) */}
      <div style={{ height: "var(--toolbar-h)", flexShrink: 0 }} />

      <div style={{ padding: "0 10px 6px" }}>
        <button onClick={onHome} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", cursor: "pointer", color: "var(--text-2)", font: "inherit", fontSize: 12.5, height: 28, padding: "0 8px", borderRadius: "var(--r-ctrl)", width: "100%" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
          <MIcon name="chevron" size={13} style={{ transform: "scaleX(-1)" }} /> Závody
        </button>
      </div>

      <div style={{ padding: "4px 16px 6px", fontSize: 11, fontWeight: 600, color: "var(--text-3)", letterSpacing: "0.02em" }}>Kategorie</div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "0 8px 10px" }}>
        {CATEGORIES.map((c) => {
          const on = c.id === activeCat;
          return <SideItem key={c.id} icon={CAT_ICON[c.id] || "car"} label={c.label} count={CATEGORY_COUNTS[c.id]} active={on} onClick={() => onCat(c.id)} />;
        })}
      </nav>

      <div style={{ borderTop: "0.5px solid var(--hairline)", padding: "9px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 28, height: 28, borderRadius: 99, background: "linear-gradient(160deg,#8a8d93,#5c5f66)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>ČM</span>
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.3, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-1)" }}>Časoměřič</span>
          <span className="tnum" style={{ fontSize: 11.5, color: "var(--text-3)" }}>{RACE_META.date}</span>
        </span>
      </div>
    </aside>
  );
}

function SideItem({ icon, label, count, active, onClick }) {
  const [h, setH] = useMS(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", height: 32, padding: "0 9px", margin: "1px 0",
        borderRadius: "var(--r-ctrl)", border: "none", cursor: "pointer",
        background: active ? "var(--accent)" : h ? "var(--hover)" : "transparent",
        color: active ? "#fff" : "var(--text-1)", textAlign: "left", font: "inherit" }}>
      <MIcon name={icon} size={15} style={{ color: active ? "rgba(255,255,255,0.9)" : "var(--text-2)" }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 510 : 450 }}>{label}</span>
      {count != null && <span className="tnum" style={{ fontSize: 12, color: active ? "rgba(255,255,255,0.8)" : "var(--text-3)" }}>{count}</span>}
    </button>
  );
}

// ---------- Unified toolbar ----------
function Toolbar({ catLabel, phaseLabel, stopwatch, onStopwatch, onPdf }) {
  return (
    <div className="no-print" style={{
      height: "var(--toolbar-h)", flexShrink: 0, display: "flex", alignItems: "center", gap: 10,
      padding: "0 16px", background: "var(--toolbar)", backdropFilter: "blur(50px) saturate(1.8)",
      WebkitBackdropFilter: "blur(50px) saturate(1.8)", borderBottom: "0.5px solid var(--hairline)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, minWidth: 0 }}>
        <span style={{ color: "var(--text-2)" }}>{catLabel}</span>
        <MIcon name="chevron" size={12} style={{ color: "var(--text-3)" }} />
        <span style={{ color: "var(--text-1)", fontWeight: 590 }}>{phaseLabel}</span>
      </div>
      <div style={{ flex: 1 }} />
      <Btn variant={stopwatch ? "primary" : "bezel"} icon="stopwatch" onClick={onStopwatch}>Stopky</Btn>
      <Btn variant="primary" icon="pdf" onClick={onPdf}>Uložit PDF</Btn>
    </div>
  );
}

// ---------- Segmentový přepínač fází ----------
function Segmented({ active, onTab }) {
  return (
    <div className="no-print" style={{ padding: "12px 16px 4px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--seg-track)", borderRadius: 9, padding: 2, overflowX: "auto", scrollbarWidth: "none" }}>
        {PHASES.map((p, i) => {
          const on = p.id === active;
          const prevOn = i > 0 && PHASES[i - 1].id === active;
          return (
            <button key={p.id} onClick={() => onTab(p.id)} style={{
              position: "relative", height: 28, padding: "0 13px", border: "none", cursor: "pointer", whiteSpace: "nowrap",
              font: "inherit", fontSize: 12.5, fontWeight: on ? 590 : 450, color: on ? "var(--text-1)" : "var(--text-2)",
              background: on ? "var(--seg-sel)" : "transparent", borderRadius: 7, boxShadow: on ? "var(--seg-sel-shadow)" : "none",
              flexShrink: 0, transition: "background .12s",
            }}>
              {!on && !prevOn && i !== 0 && <span style={{ position: "absolute", left: -1, top: 7, bottom: 7, width: 1, background: "var(--divider)" }} />}
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Hlavička obsahu ----------
function ContentHead({ title, sub, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "14px 22px 12px", flexWrap: "wrap" }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 680, letterSpacing: "-0.02em", color: "var(--text-1)" }}>{title}</h2>
        {sub && <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--text-2)" }}>{sub}</p>}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{children}</div>
    </div>
  );
}

Object.assign(window, { Sidebar, Toolbar, Segmented, ContentHead });
