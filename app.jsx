import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";

/* ── palette ───────────────────────────────────────────────────────────── */
const C = {
  ink: "#12171F",
  panel: "#1A222C",
  panel2: "#212B37",
  rule: "#2F3E4F",
  delft: "#3E6FA8",
  delftLo: "#274A72",
  delftHi: "#89B0D8",
  bisque: "#E6E0D0",
  bisqueDim: "#9AA3A9",
  brass: "#C9A227",
};

const DISPLAY = "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif";
const BODY = "'Avenir Next','Segoe UI',system-ui,-apple-system,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

const MEMBER_COLORS = ["#C9A227", "#8E4A46", "#6E8B6B", "#B87333", "#7A6AA8", "#3E6FA8"];

/* ── the route ─────────────────────────────────────────────────────────── */
const STOPS = [
  {
    n: 1, name: "Café Karpershoek", year: 1606, addr: "Martelaarsgracht 2",
    lat: 52.3782851, lon: 4.8967176, legFrom: null, legMin: null,
    note: "The oldest bar in the city, opened for sailors coming off the harbour. Sand still goes down on the floor to soak up spilled beer.",
    order: "A vaasje — small pilsner, two fingers of foam.",
    hours: "Daily from 10:00",
  },
  {
    n: 2, name: "In 't Aepjen", year: 1519, addr: "Zeedijk 1",
    lat: 52.3762704, lon: 4.9001675, legFrom: 400, legMin: 5,
    note: "One of only two medieval wooden houses left standing. Broke sailors paid for lodging with monkeys brought back from the Indies — still the Dutch phrase for being in a bad spot.",
    order: "Aepjen bier. Room for about twenty people, so go at opening.",
    hours: "Daily from 14:00",
  },
  {
    n: 3, name: "Wynand Fockink", year: 1679, addr: "Pijlsteeg 31",
    lat: 52.372311, lon: 4.895329, legFrom: 750, legMin: 10,
    note: "Not a pub but a proeflokaal — a distillery tasting room. The glass is poured to the meniscus, so the first sip is taken bowing over the bar, hands behind your back.",
    order: "Oude jenever. Ask them to pick.",
    hours: "Daily 14:00–21:00",
  },
  {
    n: 4, name: "De Drie Fleschjes", year: 1650, addr: "Gravenstraat 18",
    lat: 52.3742843, lon: 4.8923114, legFrom: 450, legMin: 6,
    note: "Hidden in the alley behind the Nieuwe Kerk. The back wall is numbered private casks belonging to Amsterdam firms, some held for generations.",
    order: "A korenwijn, if they have it open.",
    hours: "Mon–Sat 14:00–20:30 · Sun 15:00–19:00",
  },
  {
    n: 5, name: "Café de Dokter", year: 1798, addr: "Rozenboomsteeg 4",
    lat: 52.3692539, lon: 4.8908111, legFrom: 700, legMin: 9,
    note: "Smallest bar in Amsterdam — fourteen seats, same family since it opened. Vinyl only, candlelight, and dust on the chandeliers kept as a point of pride.",
    order: "The gin and tonic. Let them put ginger in it.",
    hours: "Wed–Sat from 16:00 only", pin: true,
  },
  {
    n: 6, name: "Hoppe", year: 1670, addr: "Spui 18",
    lat: 52.3688139, lon: 4.8886278, legFrom: 200, legMin: 3,
    note: "The most famous brown café in the country. Two doors side by side — take the right-hand one for the original standing bar with the sand floor. The left is a modern room.",
    order: "Stand up. Nobody sits in the right-hand bar.",
    hours: "Daily from 09:00",
  },
  {
    n: 7, name: "Café Chris", year: 1624, addr: "Bloemstraat 42",
    lat: 52.3742752, lon: 4.8816114, legFrom: 950, legMin: 12,
    note: "Oldest bar in the Jordaan. The story goes that the men building the Westerkerk collected their wages here and drank them on the spot. The toilet flushes from a lever out in the bar.",
    order: "Whatever's on the middle tap.",
    hours: "Daily from 12:00",
  },
  {
    n: 8, name: "Café 't Smalle", year: 1786, addr: "Egelantiersgracht 12",
    lat: 52.3767128, lon: 4.8841696, legFrom: 400, legMin: 5,
    note: "Started life as Pieter Hoppe's jenever distillery. The pontoon terrace over the canal is the best drinking spot in Amsterdam. Good moment to eat something.",
    order: "The smoked sausage sandwich. Not optional.",
    hours: "Daily from 14:00",
  },
  {
    n: 9, name: "Café Papeneiland", year: 1642, addr: "Prinsengracht 2",
    lat: 52.3804627, lon: 4.8879704, legFrom: 600, legMin: 8,
    note: "Named for the hidden Catholic church across the water, with a persistent story of a tunnel beneath the canal. Delft tiles, a stove in the middle of the room, apple pie people queue for.",
    order: "Appeltaart met slagroom. Centraal is ten minutes east.",
    hours: "Daily from 10:00",
  },
];

const ANCHOR = { lat: 52.3791, lon: 4.9003, name: "Centraal" };
const TOTAL_M = STOPS.reduce((a, s) => a + (s.legFrom || 0), 0);
const NEAR_M = 75;

/* ── config (set in index.html) ────────────────────────────────────────── */
const CFG = (typeof window !== "undefined" && window.KROEG_CONFIG) || {};
const SYNC_ON = !!(CFG.supabaseUrl && CFG.supabaseKey);
const ROOM = (() => {
  const q = new URLSearchParams(location.search).get("room");
  return (q || CFG.room || "amsterdam").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || "amsterdam";
})();

/* ── geo helpers ───────────────────────────────────────────────────────── */
function metersBetween(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const KX = Math.cos(52.376 * Math.PI / 180);
const bounds = (() => {
  const all = [...STOPS, ANCHOR];
  const la = all.map((s) => s.lat), lo = all.map((s) => s.lon);
  return { minLat: Math.min(...la), maxLat: Math.max(...la), minLon: Math.min(...lo), maxLon: Math.max(...lo) };
})();
const MAP_W = 320, MAP_H = 330, PAD = 26;
function project(lat, lon) {
  const wDeg = (bounds.maxLon - bounds.minLon) * KX;
  const hDeg = bounds.maxLat - bounds.minLat;
  const x = PAD + ((lon - bounds.minLon) * KX / wDeg) * (MAP_W - PAD * 2);
  const y = PAD + (1 - (lat - bounds.minLat) / hDeg) * (MAP_H - PAD * 2);
  return [x, y];
}

function ago(ts) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
const clockOf = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
function elapsed(ms) {
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
const newId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

/* ── storage ───────────────────────────────────────────────────────────── */
/* Personal progress: localStorage — works on any real website, survives a
   closed browser, and keeps working with no signal.                        */
const local = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

/* Shared board: Supabase REST (PostgREST). No SDK — just fetch.            */
const sb = {
  url: (CFG.supabaseUrl || "").replace(/\/$/, ""),
  key: CFG.supabaseKey || "",
  headers() {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    };
  },
  async push(row) {
    if (!SYNC_ON) return false;
    const r = await fetch(`${this.url}/rest/v1/party?on_conflict=id`, {
      method: "POST", headers: this.headers(), body: JSON.stringify([row]),
    });
    return r.ok;
  },
  async pull(room, since) {
    if (!SYNC_ON) return null;
    const q = `room=eq.${encodeURIComponent(room)}&seen=gt.${since}&select=*`;
    const r = await fetch(`${this.url}/rest/v1/party?${q}`, {
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}` },
    });
    if (!r.ok) return null;
    return await r.json();
  },
};

/* ── small pieces ──────────────────────────────────────────────────────── */
function Eyebrow({ children, color = C.bisqueDim }) {
  return (
    <div style={{ font: `600 10px/1 ${BODY}`, letterSpacing: ".18em", textTransform: "uppercase", color }}>
      {children}
    </div>
  );
}

function Tile({ stop, state, onTap, dots }) {
  const glazed = state === "done";
  const here = state === "here";
  return (
    <button onClick={onTap} className="kt-tile"
      aria-label={`Stop ${stop.n}, ${stop.name}${glazed ? ", visited" : here ? ", current" : ""}`}
      aria-current={here ? "step" : undefined}
      style={{
        position: "relative", flex: "1 1 0", minWidth: 0, aspectRatio: "1 / 1",
        border: `1px solid ${here ? C.brass : glazed ? C.delftLo : C.rule}`,
        background: glazed ? `linear-gradient(150deg, ${C.delft} 0%, ${C.delftLo} 100%)` : here ? C.panel2 : "transparent",
        color: glazed ? "#fff" : here ? C.brass : C.bisqueDim,
        font: `600 13px/1 ${MONO}`, cursor: "pointer", padding: 0,
        transition: "background .4s ease, color .3s ease, border-color .3s ease",
      }}>
      {glazed ? "✓" : stop.n}
      {here && <span className="kt-pulse" style={{ position: "absolute", inset: -1, border: `1px solid ${C.brass}`, pointerEvents: "none" }} />}
      {dots.length > 0 && (
        <span style={{ position: "absolute", bottom: 3, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 2 }}>
          {dots.slice(0, 4).map((c, i) => <span key={i} style={{ width: 4, height: 4, borderRadius: 4, background: c }} />)}
        </span>
      )}
    </button>
  );
}

function RouteMap({ current, done, members, meId, myCoords }) {
  const pts = STOPS.map((s) => project(s.lat, s.lon));
  const path = pts.map((p) => p.join(",")).join(" ");
  const [cx, cy] = project(ANCHOR.lat, ANCHOR.lon);
  const donePath = pts.slice(0, done.length ? current + 1 : 0).map((p) => p.join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", display: "block" }} role="img"
      aria-label="Map of the nine stops with the walking route">
      <polyline points={path} fill="none" stroke={C.rule} strokeWidth="1.5" strokeDasharray="3 4" />
      {donePath.split(" ").length > 1 && <polyline points={donePath} fill="none" stroke={C.delft} strokeWidth="2" />}
      <g>
        <circle cx={cx} cy={cy} r="3" fill="none" stroke={C.bisqueDim} strokeWidth="1" />
        <text x={cx + 7} y={cy + 3} fill={C.bisqueDim} style={{ font: `9px ${MONO}`, letterSpacing: ".08em" }}>CS</text>
      </g>
      {STOPS.map((s, i) => {
        const [x, y] = pts[i];
        const isDone = done.includes(s.n);
        const isHere = i === current;
        return (
          <g key={s.n}>
            <circle cx={x} cy={y} r={isHere ? 8 : 6.5} fill={isDone ? C.delft : C.ink}
              stroke={isHere ? C.brass : isDone ? C.delftHi : C.rule} strokeWidth={isHere ? 2 : 1.2} />
            <text x={x} y={y + 3.2} textAnchor="middle" fill={isDone ? "#fff" : isHere ? C.brass : C.bisqueDim}
              style={{ font: `600 8px ${MONO}` }}>{s.n}</text>
          </g>
        );
      })}
      {Object.values(members).map((m, idx) => {
        let x, y;
        if (m.coords) { [x, y] = project(m.coords.lat, m.coords.lon); }
        else {
          const s = STOPS[Math.min(m.at ?? 0, 8)];
          [x, y] = project(s.lat, s.lon);
          x += 11 + (idx % 3) * 7; y -= 9 + Math.floor(idx / 3) * 7;
        }
        return (
          <g key={m.id}>
            <circle cx={x} cy={y} r="4" fill={m.color} stroke={C.ink} strokeWidth="1.5" />
            {m.id === meId && <circle cx={x} cy={y} r="7.5" fill="none" stroke={m.color} strokeWidth="1" opacity=".55" />}
          </g>
        );
      })}
      {myCoords && (
        <circle cx={project(myCoords.lat, myCoords.lon)[0]} cy={project(myCoords.lat, myCoords.lon)[1]} r="3" fill="#fff" />
      )}
    </svg>
  );
}

/* ── join ──────────────────────────────────────────────────────────────── */
function Join({ onJoin }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const go = () => { if (name.trim()) onJoin(name.trim().slice(0, 18), color); };

  return (
    <div style={{ padding: "48px 20px", maxWidth: 420, margin: "0 auto" }}>
      <Eyebrow color={C.delftHi}>Amsterdam · negen bruine kroegen</Eyebrow>
      <h1 style={{ font: `400 34px/1.05 ${DISPLAY}`, color: C.bisque, margin: "14px 0 10px" }}>De Kroegentocht</h1>
      <p style={{ font: `400 15px/1.5 ${BODY}`, color: C.bisqueDim, margin: "0 0 28px" }}>
        Nine of the oldest bars in the city, 4.5 km, ending ten minutes from where you started.
        Put your name in and everyone walking with you sees the same board.
      </p>

      <div style={{ marginBottom: 8 }}><Eyebrow>Your name</Eyebrow></div>
      <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder="Sam" maxLength={18}
        style={{
          width: "100%", boxSizing: "border-box", padding: "13px 14px", background: C.panel,
          border: `1px solid ${C.rule}`, color: C.bisque, font: `400 17px ${BODY}`, outline: "none", borderRadius: 2,
        }} />

      <div style={{ margin: "22px 0 10px" }}><Eyebrow>Your marker</Eyebrow></div>
      <div style={{ display: "flex", gap: 10 }}>
        {MEMBER_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} aria-label={`Marker colour ${c}`}
            style={{
              width: 38, height: 38, borderRadius: 38, background: c, cursor: "pointer",
              border: color === c ? `2px solid ${C.bisque}` : "2px solid transparent", outlineOffset: 2,
            }} />
        ))}
      </div>

      <button onClick={go} disabled={!name.trim()}
        style={{
          width: "100%", marginTop: 30, padding: 16, cursor: name.trim() ? "pointer" : "not-allowed",
          background: name.trim() ? C.delft : C.panel, border: "none", borderRadius: 2,
          color: name.trim() ? "#fff" : C.bisqueDim,
          font: `600 12px ${BODY}`, letterSpacing: ".16em", textTransform: "uppercase",
        }}>
        Start the crawl
      </button>

      <p style={{ font: `400 12px/1.5 ${BODY}`, color: C.bisqueDim, marginTop: 18, opacity: .8 }}>
        {SYNC_ON
          ? <>Group <span style={{ font: `12px ${MONO}`, color: C.delftHi }}>{ROOM}</span>. Your name and progress are visible to everyone in it. Position only if you turn it on.</>
          : <>Running solo — progress is saved on this phone only. Add a Supabase key in index.html to sync a group.</>}
      </p>
    </div>
  );
}

/* ── main ──────────────────────────────────────────────────────────────── */
function App() {
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState({});
  const [checkins, setCheckins] = useState({});
  const [viewing, setViewing] = useState(0);
  const [coords, setCoords] = useState(null);
  const [geoState, setGeoState] = useState("off");
  const [shareLoc, setShareLoc] = useState(false);
  const [booted, setBooted] = useState(false);
  const [synced, setSynced] = useState(SYNC_ON ? null : false);
  const [copied, setCopied] = useState(false);
  const watchId = useRef(null);
  const stateRef = useRef({});

  const doneList = Object.keys(checkins).map(Number).sort((a, b) => a - b);
  const current = Math.min(doneList.length, 8);
  const startedAt = doneList.length ? Math.min(...Object.values(checkins)) : null;

  stateRef.current = { me, checkins, current, coords, shareLoc };

  useEffect(() => {
    const saved = local.get("kroeg:me");
    if (saved?.id) {
      setMe({ id: saved.id, name: saved.name, color: saved.color });
      setCheckins(saved.checkins || {});
      setViewing(Math.min(Object.keys(saved.checkins || {}).length, 8));
    }
    setBooted(true);
  }, []);

  const beat = useCallback(async () => {
    const { me: m, checkins: ci, current: cur, coords: co, shareLoc: sl } = stateRef.current;
    if (!m || !SYNC_ON) return;
    try {
      const ok = await sb.push({
        id: m.id, room: ROOM, name: m.name, color: m.color, stop_idx: cur,
        done_count: Object.keys(ci).length,
        last_in: Object.keys(ci).length ? Math.max(...Object.values(ci)) : null,
        seen: Date.now(),
        lat: sl && co ? +co.lat.toFixed(5) : null,
        lon: sl && co ? +co.lon.toFixed(5) : null,
      });
      const rows = await sb.pull(ROOM, Date.now() - 8 * 3600 * 1000);
      if (rows) {
        const next = {};
        for (const r of rows) {
          next[r.id] = {
            id: r.id, name: r.name, color: r.color, at: r.stop_idx, done: r.done_count,
            last: r.last_in, seen: Number(r.seen),
            coords: r.lat != null && r.lon != null ? { lat: r.lat, lon: r.lon } : null,
          };
        }
        setMembers(next);
      }
      setSynced(!!ok && !!rows);
    } catch { setSynced(false); }
  }, []);

  useEffect(() => {
    if (!me || !SYNC_ON) return;
    beat();
    const t = setInterval(beat, 12000);
    return () => clearInterval(t);
  }, [me, beat]);

  useEffect(() => { if (me) local.set("kroeg:me", { ...me, checkins }); }, [me, checkins]);

  const startGeo = () => {
    if (!navigator.geolocation) { setGeoState("denied"); return; }
    setGeoState("asking");
    watchId.current = navigator.geolocation.watchPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }); setGeoState("on"); },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
    );
  };
  const stopGeo = () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null; setCoords(null); setShareLoc(false); setGeoState("off");
  };
  useEffect(() => () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); }, []);

  const join = (name, color) => {
    const m = { id: newId(), name, color };
    setMe(m); setCheckins({}); setViewing(0);
    local.set("kroeg:me", { ...m, checkins: {} });
  };
  const checkIn = (n) => {
    setCheckins((prev) => (prev[n] ? prev : { ...prev, [n]: Date.now() }));
    setViewing(Math.min(n, 8));
    setTimeout(beat, 200);
  };
  const undo = (n) => setCheckins((prev) => { const c = { ...prev }; delete c[n]; return c; });
  const resetAll = () => {
    setCheckins({}); setViewing(0);
    if (me) local.set("kroeg:me", { ...me, checkins: {} });
    setTimeout(beat, 200);
  };
  const copyInvite = async () => {
    const url = `${location.origin}${location.pathname}?room=${ROOM}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { prompt("Copy this link:", url); }
  };

  if (!booted) return <div style={{ minHeight: "100vh", background: C.ink }} />;
  if (!me) return <div style={{ minHeight: "100vh", background: C.ink, fontFamily: BODY }}><Styles /><Join onJoin={join} /></div>;

  const stop = STOPS[viewing];
  const others = Object.values(members).filter((m) => m.id !== me.id).sort((a, b) => b.at - a.at);
  const nearest = coords ? STOPS.map((s) => ({ s, d: metersBetween(coords, s) })).sort((a, b) => a.d - b.d)[0] : null;
  const distToViewing = coords ? metersBetween(coords, stop) : null;
  const prompt2 = nearest && nearest.d < NEAR_M && !checkins[nearest.s.n] ? nearest : null;
  const dotsFor = (i) => Object.values(members).filter((m) => m.at === i).map((m) => m.color);

  return (
    <div style={{ minHeight: "100vh", background: C.ink, fontFamily: BODY, color: C.bisque }}>
      <Styles />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "22px 16px 60px" }}>

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
          <div>
            <Eyebrow color={C.delftHi}>Negen bruine kroegen</Eyebrow>
            <h1 style={{ font: `400 26px/1 ${DISPLAY}`, margin: "8px 0 0" }}>De Kroegentocht</h1>
          </div>
          <div style={{ textAlign: "right", font: `11px/1.5 ${MONO}`, color: C.bisqueDim }}>
            <div>{doneList.length}/9 stops</div>
            <div>{startedAt ? elapsed(Date.now() - startedAt) : `${(TOTAL_M / 1000).toFixed(1)} km`}</div>
          </div>
        </header>

        <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
          {STOPS.map((s, i) => (
            <Tile key={s.n} stop={s} dots={dotsFor(i)}
              state={checkins[s.n] ? "done" : i === current ? "here" : "todo"}
              onTap={() => setViewing(i)} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", font: `10px ${MONO}`, color: C.bisqueDim, marginBottom: 20 }}>
          <span>CENTRAAL</span><span>JORDAAN</span>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.rule}`, padding: 4, marginBottom: 14 }}>
          <RouteMap current={current} done={doneList} members={members} meId={me.id} myCoords={shareLoc ? null : coords} />
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", marginBottom: 20,
          background: C.panel, border: `1px solid ${C.rule}`, font: `12px ${BODY}`, color: C.bisqueDim,
        }}>
          {geoState === "on" ? (
            <>
              <span style={{ width: 7, height: 7, borderRadius: 7, background: C.delftHi, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                {nearest && nearest.d < 400
                  ? <>Nearest: <span style={{ color: C.bisque }}>{nearest.s.name}</span>, {nearest.d} m</>
                  : "Located. No stop within 400 m."}
              </span>
              {SYNC_ON && (
                <button onClick={() => setShareLoc((v) => !v)} className="kt-link" style={{ color: shareLoc ? C.brass : C.delftHi }}>
                  {shareLoc ? "Sharing" : "Share"}
                </button>
              )}
              <button onClick={stopGeo} className="kt-link" style={{ color: C.bisqueDim }}>Off</button>
            </>
          ) : geoState === "asking" ? <span>Waiting for a fix…</span>
            : geoState === "denied" ? <span>Location is off. Check in by hand — everything else works.</span>
              : <>
                <span style={{ flex: 1 }}>Use location to measure distance to the next door.</span>
                <button onClick={startGeo} className="kt-link" style={{ color: C.delftHi }}>Turn on</button>
              </>}
        </div>

        {prompt2 && (
          <div style={{ padding: 14, marginBottom: 20, background: C.delftLo, border: `1px solid ${C.delft}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, font: `14px/1.4 ${BODY}`, color: "#fff" }}>
              You're {prompt2.d} m from <strong>{prompt2.s.name}</strong>.
            </div>
            <button onClick={() => checkIn(prompt2.s.n)}
              style={{ background: "#fff", color: C.delftLo, border: "none", padding: "9px 14px", cursor: "pointer", font: `600 11px ${BODY}`, letterSpacing: ".12em", textTransform: "uppercase" }}>
              Check in
            </button>
          </div>
        )}

        <article style={{ background: C.panel, border: `1px solid ${C.rule}`, padding: "18px 16px 16px", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Eyebrow color={checkins[stop.n] ? C.delftHi : C.brass}>
              Stop {stop.n} of 9{checkins[stop.n] ? ` · in at ${clockOf(checkins[stop.n])}` : ""}
            </Eyebrow>
            <span style={{ font: `12px ${MONO}`, color: C.bisqueDim }}>{stop.year}</span>
          </div>

          <h2 style={{ font: `400 25px/1.1 ${DISPLAY}`, margin: "10px 0 4px" }}>{stop.name}</h2>
          <div style={{ font: `13px ${MONO}`, color: C.bisqueDim, marginBottom: 14 }}>
            {stop.addr}{stop.legFrom ? ` · ${stop.legFrom} m · ${stop.legMin} min walk` : " · start here"}
            {distToViewing != null && <span style={{ color: C.delftHi }}> · {distToViewing} m away</span>}
          </div>

          <p style={{ font: `400 15px/1.55 ${BODY}`, margin: "0 0 14px" }}>{stop.note}</p>

          <div style={{ borderLeft: `2px solid ${stop.pin ? C.brass : C.delft}`, paddingLeft: 12, marginBottom: 16 }}>
            <div style={{ font: `400 14px/1.5 ${BODY}`, color: C.bisque }}>{stop.order}</div>
            <div style={{ font: `12px/1.5 ${MONO}`, color: stop.pin ? C.brass : C.bisqueDim, marginTop: 4 }}>{stop.hours}</div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {checkins[stop.n]
              ? <button onClick={() => undo(stop.n)} style={btn(C.panel2, C.bisqueDim, C.rule)}>Undo check-in</button>
              : <button onClick={() => checkIn(stop.n)} style={btn(C.delft, "#fff")}>I'm here</button>}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lon}&travelmode=walking`}
              target="_blank" rel="noopener noreferrer"
              style={{ ...btn(C.panel2, C.bisque, C.rule), textDecoration: "none", textAlign: "center", flex: "0 0 auto", padding: "13px 16px" }}>
              Walk there
            </a>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
            <button className="kt-link" onClick={() => setViewing((v) => Math.max(0, v - 1))} disabled={viewing === 0}
              style={{ color: viewing === 0 ? C.rule : C.delftHi }}>← Previous</button>
            <button className="kt-link" onClick={() => setViewing((v) => Math.min(8, v + 1))} disabled={viewing === 8}
              style={{ color: viewing === 8 ? C.rule : C.delftHi }}>Next →</button>
          </div>
        </article>

        <section style={{ marginBottom: 26 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <Eyebrow>Walking with you</Eyebrow>
            <span style={{ font: `10px ${MONO}`, color: C.bisqueDim }}>
              {!SYNC_ON ? "solo mode" : synced === false ? "offline" : synced === null ? "…" : `live · ${ROOM}`}
            </span>
          </div>

          <Row m={{ ...me, at: current, done: doneList.length, seen: Date.now() }} isMe />
          {others.map((m) => <Row key={m.id} m={m} />)}

          {SYNC_ON && others.length === 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ font: `13px/1.5 ${BODY}`, color: C.bisqueDim, margin: "0 0 10px" }}>
                Nobody else yet. Send the link — when they put a name in they appear here and on the tiles.
              </p>
              <button onClick={copyInvite} style={btn(C.panel2, C.bisque, C.rule)}>
                {copied ? "Link copied" : "Copy invite link"}
              </button>
            </div>
          )}
          {!SYNC_ON && (
            <p style={{ font: `13px/1.5 ${BODY}`, color: C.bisqueDim, margin: "10px 0 0" }}>
              Solo mode. Progress saves on this phone. To put friends on the board, add your Supabase
              keys at the top of index.html — see the README.
            </p>
          )}
        </section>

        {startedAt && doneList.length >= 3 && (
          <div style={{ font: `12px/1.6 ${MONO}`, color: C.bisqueDim, borderTop: `1px solid ${C.rule}`, paddingTop: 14, marginBottom: 14 }}>
            {doneList.length} bars in {elapsed(Date.now() - startedAt)}.
            {" "}{STOPS.slice(0, current).reduce((a, s) => a + (s.legFrom || 0), 0)} m walked.
            {doneList.length >= 5 && <span style={{ color: C.brass }}> Vaasjes from here.</span>}
          </div>
        )}

        <footer style={{ font: `11px/1.6 ${BODY}`, color: C.bisqueDim, opacity: .75 }}>
          {SYNC_ON && <>Anyone with the link to group <span style={{ font: `11px ${MONO}` }}>{ROOM}</span> sees the names and progress on this board. Position is only shared while <em>Sharing</em> is lit. </>}
          <button className="kt-link" onClick={resetAll} style={{ color: C.bisqueDim, textDecoration: "underline" }}>Clear my crawl</button>
        </footer>
      </div>
    </div>
  );
}

function Row({ m, isMe }) {
  const at = STOPS[Math.min(m.at ?? 0, 8)];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: `1px solid ${C.rule}` }}>
      <span style={{ width: 9, height: 9, borderRadius: 9, background: m.color, flexShrink: 0 }} />
      <span style={{ font: `500 15px ${BODY}`, color: C.bisque, flexShrink: 0 }}>
        {m.name}{isMe && <span style={{ color: C.bisqueDim, fontSize: 12 }}> · you</span>}
      </span>
      <span style={{ flex: 1, textAlign: "right", font: `12px ${MONO}`, color: C.bisqueDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {m.done ? at.name : "not started"}
      </span>
      <span style={{ font: `11px ${MONO}`, color: C.rule, flexShrink: 0, width: 52, textAlign: "right" }}>
        {isMe ? "now" : ago(m.seen)}
      </span>
    </div>
  );
}

const btn = (bg, fg, border) => ({
  flex: 1, padding: "13px 10px", background: bg, color: fg,
  border: border ? `1px solid ${border}` : "none", borderRadius: 2, cursor: "pointer",
  font: `600 12px ${BODY}`, letterSpacing: ".14em", textTransform: "uppercase",
});

function Styles() {
  return (
    <style>{`
      .kt-link { background:none; border:none; padding:0; cursor:pointer;
        font:600 11px ${BODY}; letter-spacing:.1em; text-transform:uppercase; }
      .kt-link:disabled { cursor:default; }
      .kt-tile:focus-visible, .kt-link:focus-visible, button:focus-visible, a:focus-visible, input:focus-visible {
        outline:2px solid ${C.brass}; outline-offset:2px; }
      input::placeholder { color:${C.rule}; }
      @keyframes ktPulse { 0%,100% { opacity:.9 } 50% { opacity:.25 } }
      .kt-pulse { animation: ktPulse 2.4s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) {
        .kt-pulse { animation:none }
        .kt-tile { transition:none !important }
      }
    `}</style>
  );
}

createRoot(document.getElementById("root")).render(<App />);
