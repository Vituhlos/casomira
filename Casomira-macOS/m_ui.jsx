/* m_ui.jsx — macOS UI primitivy */

const { useState: useMU, useRef: useRMU, useEffect: useEMU } = React;

// ---------- Ikony (SF-styl, stroke 1.5) ----------
function MIcon({ name, size = 16, style }) {
  const p = {
    timer: <><path d="M8 1.6h4M10 4.2v3" /><circle cx="10" cy="11.5" r="6" /></>,
    flag: <><path d="M4.5 17V3.4c2.4-1.1 4 1.1 6.4 0s4-.7 4-.7v6.6s-1.6.6-4 .7-4-1.1-6.4 0" /></>,
    car: <><path d="M2.6 11l1.6-3.9a1.6 1.6 0 0 1 1.5-1h8.6a1.6 1.6 0 0 1 1.5 1L17.4 11" /><path d="M2.6 11h14.8v3.1a.8.8 0 0 1-.8.8h-1.1a.8.8 0 0 1-.8-.8V14H5.3v.1a.8.8 0 0 1-.8.8H3.4a.8.8 0 0 1-.8-.8z" /><path d="M5.3 12.6h.01M14.7 12.6h.01" /></>,
    cup: <><path d="M5.5 3h9v2.3A4.5 4.5 0 0 1 5.5 5.3z" /><path d="M5.5 3.6H3.6v.6A2.1 2.1 0 0 0 5.6 6.3M14.5 3.6h1.9v.6a2.1 2.1 0 0 1-2 2.1M10 9.5v3M8 15h4" /></>,
    list: <><path d="M6.5 5h11M6.5 10h11M6.5 15h11" /><path d="M3.2 5h.01M3.2 10h.01M3.2 15h.01" /></>,
    pdf: <><path d="M11 2.6H6.2A1.5 1.5 0 0 0 4.7 4.1v11.8a1.5 1.5 0 0 0 1.5 1.5h7.6a1.5 1.5 0 0 0 1.5-1.5V7z" /><path d="M11 2.6V7h4.3" /></>,
    stopwatch: <><path d="M8 1.8h4" /><circle cx="10" cy="11" r="6.2" /><path d="M10 11V7.5M14 6.9l1-1" /></>,
    plus: <><path d="M10 4.4v11.2M4.4 10h11.2" /></>,
    import: <><path d="M10 2.6v9M6.9 8.4 10 11.5l3.1-3.1" /><path d="M4.6 15.4h10.8" /></>,
    sort: <><path d="M6 4v12M6 16l-2.1-2.1M6 4l2.1 2.1" /><path d="M14 16V4M14 4l2.1 2.1M14 16l-2.1-2.1" /></>,
    play: <><path d="M6.6 4.3 15 10l-8.4 5.7z" /></>,
    pause: <><rect x="6.2" y="4.6" width="2.5" height="10.8" rx="1" /><rect x="11.3" y="4.6" width="2.5" height="10.8" rx="1" /></>,
    undo: <><path d="M7.6 5.6 4.1 9l3.5 3.4" /><path d="M4.1 9h7.9a4 4 0 0 1 0 8h-1" /></>,
    reset: <><path d="M4.2 10a6 6 0 1 1 1.8 4.2" /><path d="M4.2 6.6V10h3.4" /></>,
    chevron: <><path d="m8 5 5 5-5 5" /></>,
    trophy: <><path d="M6 3h8v3a4 4 0 0 1-8 0z" /><path d="M6 3.6H3.6v.7a2.4 2.4 0 0 0 2.4 2.4M14 3.6h2.4v.7a2.4 2.4 0 0 1-2.4 2.4" /><path d="M10 10v3.2M7.4 16.5h5.2M8.6 13.4h2.8" /></>,
  }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>{p}</svg>
  );
}

// ---------- Traffic lights ----------
function TrafficLights() {
  const [h, setH] = useMU(false);
  const dots = [
    { c: "#ff5f57", b: "#e0443e", g: <><line x1="2.4" y1="2.4" x2="5.6" y2="5.6" /><line x1="5.6" y1="2.4" x2="2.4" y2="5.6" /></> },
    { c: "#febc2e", b: "#dea123", g: <line x1="2" y1="4" x2="6" y2="4" /> },
    { c: "#28c840", b: "#1dab2e", g: <><path d="M2.3 4 A2 2 0 0 0 5.7 4" /><path d="M2.3 4 A2 2 0 0 1 5.7 4" /></> },
  ];
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ display: "flex", gap: 8 }}>
      {dots.map((d, i) => (
        <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: d.c, boxShadow: `inset 0 0 0 0.5px ${d.b}`, display: "grid", placeItems: "center" }}>
          <svg width="8" height="8" viewBox="0 0 8 8" stroke="rgba(0,0,0,0.5)" strokeWidth="1" strokeLinecap="round" fill="none" style={{ opacity: h ? 1 : 0 }}>{d.g}</svg>
        </span>
      ))}
    </div>
  );
}

// ---------- Tlačítko ----------
function Btn({ children, variant = "bezel", icon, onClick, title, size = "md", style, disabled }) {
  const [h, setH] = useMU(false);
  const ht = size === "lg" ? 34 : size === "sm" ? 24 : 28;
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    height: ht, padding: size === "lg" ? "0 16px" : "0 12px", borderRadius: "var(--r-ctrl)",
    font: "inherit", fontSize: size === "lg" ? 14 : 13, fontWeight: 500, cursor: disabled ? "default" : "pointer",
    whiteSpace: "nowrap", border: "none", transition: "background .1s, filter .1s", opacity: disabled ? 0.4 : 1, lineHeight: 1,
  };
  let v;
  if (variant === "primary") {
    v = { background: "var(--accent)", color: "var(--on-accent)", filter: h ? "brightness(1.07)" : "none", boxShadow: "0 1px 1.5px rgba(0,0,0,0.12)", fontWeight: 510 };
  } else if (variant === "plain") {
    v = { background: h ? "var(--hover)" : "transparent", color: "var(--accent-text)", fontWeight: 510 };
  } else {
    v = { background: h ? "color-mix(in srgb, var(--ctrl-bg) 92%, #000)" : "var(--ctrl-bg)", color: "var(--text-1)", boxShadow: "var(--shadow-btn)" };
  }
  return (
    <button title={title} onClick={disabled ? undefined : onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ ...base, ...v, ...style }}>
      {icon && <MIcon name={icon} size={size === "lg" ? 17 : 15} />}
      {children}
    </button>
  );
}

// ---------- Badge DNF/DNS/DQ ----------
function Badge({ status }) {
  const dark = document.documentElement.dataset.theme === "dark";
  const map = {
    DNF: { fg: "#9a6400", bg: "rgba(255,159,10,0.16)", dfg: "#ffb340", dbg: "rgba(255,159,10,0.22)" },
    DNS: { fg: "var(--text-2)", bg: "rgba(120,120,128,0.14)", dfg: "var(--text-2)", dbg: "rgba(120,120,128,0.22)" },
    DQ:  { fg: "#c93636", bg: "rgba(255,59,48,0.13)", dfg: "#ff6961", dbg: "rgba(255,69,58,0.20)" },
  }[status];
  if (!map) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 19, padding: "0 8px", borderRadius: "var(--r-pill)",
      fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", background: dark ? map.dbg : map.bg, color: dark ? map.dfg : map.fg }}>{status}</span>
  );
}

function Medal({ rank }) {
  const c = { 1: "#d8a32b", 2: "#9ba0a6", 3: "#bd7b43" }[rank];
  if (!c) return null;
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 99, background: c, marginRight: 8, verticalAlign: "middle" }} />;
}

Object.assign(window, { MIcon, TrafficLights, Btn, Badge, Medal });
