/* CrawlDashboard.jsx — accessible themed UI over useCrawlEngine.
   v2.4.0-build.2026.08 */
import React, { useState, useEffect } from "react";
import {
  useCrawlEngine, STOPS, ANCHOR, DRINK_KINDS, NEAR_M, TOTAL_M,
  MEMBER_COLORS, metersBetween, ago, clockOf, elapsed, VERSION,
} from "./useCrawlEngine.ts";

const DISPLAY = "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif";
const BODY = "'Avenir Next','Segoe UI',system-ui,-apple-system,sans-serif";
const MONO = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";

/* ── palettes per spec: WCAG-AAA contrast, dim-bar and sunlight legible ── */
const PALETTES = {
  day: {
    bg: "#F4F1EA", surface: "#FFFFFF", surface2: "#ECE7DB", text: "#0F172A",
    dim: "#3F4A5C", rule: "#CFC8B8", accent: "#C2410C", onAccent: "#FFFFFF",
    delft: "#2F5D8F", delftLo: "#1E3F63", delftHi: "#2F5D8F", warnBg: "#FBEFE7",
  },
  night: {
    bg: "#090D12", surface: "#161F28", surface2: "#1F2A36", text: "#F8FAFC",
    dim: "#A7B4C4", rule: "#33404E", accent: "#F97316", onAccent: "#090D12",
    delft: "#3E6FA8", delftLo: "#274A72", delftHi: "#89B0D8", warnBg: "#241A0E",
  },
};

/* ── map projection over all possible venues, swaps included ── */
const KX = Math.cos(52.376 * Math.PI / 180);
const MAP_W = 320, MAP_H = 330, PAD = 26;

function useTheme() {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem("kroeg:theme") || "auto"; } catch { return "auto"; }
  });
  const [sysDark, setSysDark] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSysDark(mq.matches);
    const fn = (e) => setSysDark(e.matches);
    mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener(fn);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", fn) : mq.removeListener(fn); };
  }, []);
  const resolved = mode === "auto" ? (sysDark ? "night" : "day") : mode;
  const cycle = () => {
    const next = mode === "auto" ? "day" : mode === "day" ? "night" : "auto";
    setMode(next);
    try { localStorage.setItem("kroeg:theme", next); } catch {}
  };
  return { T: PALETTES[resolved], mode, cycle, resolved };
}

function Eyebrow({ children, color }) {
  return (
    <div style={{ font: `700 13px/1 ${BODY}`, letterSpacing: ".16em", textTransform: "uppercase", color }}>
      {children}
    </div>
  );
}

const btn = (bg, fg, border) => ({
  flex: 1, minHeight: 48, padding: "12px 14px", background: bg, color: fg,
  border: border ? `1.5px solid ${border}` : "none", borderRadius: 3, cursor: "pointer",
  font: `700 15px ${BODY}`, letterSpacing: ".08em", textTransform: "uppercase",
});

function RouteMap({ T, stops, current, done, members, meId, myCoords }) {
  const all = [...stops, ANCHOR];
  const b = {
    minLat: Math.min(...all.map((s) => s.lat)), maxLat: Math.max(...all.map((s) => s.lat)),
    minLon: Math.min(...all.map((s) => s.lon)), maxLon: Math.max(...all.map((s) => s.lon)),
  };
  const project = (lat, lon) => {
    const wDeg = (b.maxLon - b.minLon) * KX, hDeg = b.maxLat - b.minLat;
    return [
      PAD + ((lon - b.minLon) * KX / wDeg) * (MAP_W - PAD * 2),
      PAD + (1 - (lat - b.minLat) / hDeg) * (MAP_H - PAD * 2),
    ];
  };
  const pts = stops.map((s) => project(s.lat, s.lon));
  const path = pts.map((p) => p.join(",")).join(" ");
  const [cx, cy] = project(ANCHOR.lat, ANCHOR.lon);
  const donePath = pts.slice(0, done.length ? current + 1 : 0).map((p) => p.join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{ width: "100%", display: "block" }} role="img"
      aria-label="Map of the nine stops with the walking route">
      <polyline points={path} fill="none" stroke={T.rule} strokeWidth="2" strokeDasharray="3 4" />
      {donePath.split(" ").length > 1 && <polyline points={donePath} fill="none" stroke={T.delft} strokeWidth="2.5" />}
      <g>
        <circle cx={cx} cy={cy} r="3.5" fill="none" stroke={T.dim} strokeWidth="1.4" />
        <text x={cx + 8} y={cy + 4} fill={T.dim} style={{ font: `700 10px ${MONO}` }}>CS</text>
      </g>
      {stops.map((s, i) => {
        const [x, y] = pts[i];
        const isDone = done.includes(s.n), isHere = i === current;
        return (
          <g key={s.n}>
            <circle cx={x} cy={y} r={isHere ? 9 : 7.5} fill={isDone ? T.delft : T.surface}
              stroke={isHere ? T.accent : isDone ? T.delftHi : T.dim} strokeWidth={isHere ? 2.5 : 1.4} />
            <text x={x} y={y + 3.6} textAnchor="middle" fill={isDone ? "#fff" : isHere ? T.accent : T.dim}
              style={{ font: `700 9px ${MONO}` }}>{s.n}</text>
          </g>
        );
      })}
      {Object.values(members).map((m, idx) => {
        let x, y;
        if (m.coords) { [x, y] = project(m.coords.lat, m.coords.lon); }
        else {
          const s = stops[Math.min(m.at ?? 0, 8)];
          [x, y] = project(s.lat, s.lon);
          x += 12 + (idx % 3) * 8; y -= 10 + Math.floor(idx / 3) * 8;
        }
        return (
          <g key={m.id}>
            <circle cx={x} cy={y} r="4.5" fill={m.color} stroke={T.bg} strokeWidth="1.6" />
            {m.id === meId && <circle cx={x} cy={y} r="8" fill="none" stroke={m.color} strokeWidth="1.2" opacity=".6" />}
          </g>
        );
      })}
      {myCoords && <circle cx={project(myCoords.lat, myCoords.lon)[0]} cy={project(myCoords.lat, myCoords.lon)[1]} r="3.5" fill={T.text} />}
    </svg>
  );
}

function Join({ T, onJoin, syncOn, room }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const go = () => { if (name.trim()) onJoin(name.trim().slice(0, 18), color); };
  return (
    <div style={{ padding: "48px 20px 32px", maxWidth: 440, margin: "0 auto" }}>
      <Eyebrow color={T.delftHi}>Amsterdam · negen bruine kroegen</Eyebrow>
      <h1 style={{ font: `400 36px/1.05 ${DISPLAY}`, color: T.text, margin: "14px 0 10px" }}>De Kroegentocht</h1>
      <p style={{ font: `400 18px/1.55 ${BODY}`, color: T.dim, margin: "0 0 26px" }}>
        Nine of the oldest bars in the city, 4.5 km, ending ten minutes from where you started.
        Put your name in and everyone walking with you sees the same board.
      </p>
      <div style={{ marginBottom: 8 }}><Eyebrow color={T.dim}>Your name</Eyebrow></div>
      <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder="Sam" maxLength={18}
        style={{
          width: "100%", boxSizing: "border-box", minHeight: 52, padding: "13px 14px",
          background: T.surface, border: `1.5px solid ${T.rule}`, color: T.text,
          font: `400 19px ${BODY}`, outline: "none", borderRadius: 3,
        }} />
      <div style={{ margin: "22px 0 10px" }}><Eyebrow color={T.dim}>Your marker</Eyebrow></div>
      <div style={{ display: "flex", gap: 10 }}>
        {MEMBER_COLORS.map((c) => (
          <button key={c} onClick={() => setColor(c)} aria-label={`Marker colour ${c}`}
            style={{
              width: 48, height: 48, borderRadius: 48, background: c, cursor: "pointer",
              border: color === c ? `3px solid ${T.text}` : "3px solid transparent",
            }} />
        ))}
      </div>
      <button onClick={go} disabled={!name.trim()}
        style={{
          width: "100%", marginTop: 28, minHeight: 52, padding: 14, cursor: name.trim() ? "pointer" : "not-allowed",
          background: name.trim() ? T.accent : T.surface2, border: "none", borderRadius: 3,
          color: name.trim() ? T.onAccent : T.dim,
          font: `700 16px ${BODY}`, letterSpacing: ".12em", textTransform: "uppercase",
        }}>
        Start the crawl
      </button>
      <p style={{ font: `400 15px/1.55 ${BODY}`, color: T.dim, marginTop: 18 }}>
        {syncOn
          ? <>Group <span style={{ font: `15px ${MONO}` }}>{room}</span>. Your name and progress are visible to everyone in it. Position only if you turn it on.</>
          : <>Running solo — progress is saved on this phone only. Add a Supabase key in index.html to sync a group.</>}
      </p>
      <p style={{ font: `400 15px/1.55 ${BODY}`, color: T.dim, marginTop: 8 }}>
        Bring cash or a Dutch-PIN card — brown cafés often refuse foreign credit cards.
      </p>
      <p style={{ font: `400 13px ${MONO}`, color: T.dim, marginTop: 26, opacity: .8 }}>{VERSION}</p>
    </div>
  );
}

export default function CrawlDashboard() {
  const E = useCrawlEngine();
  const { T, mode, cycle } = useTheme();

  if (!E.booted) return <div style={{ minHeight: "100vh", background: T.bg }} />;
  if (!E.me) return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: BODY }}>
      <Styles T={T} />
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "16px 20px 0", display: "flex", justifyContent: "flex-end" }}>
        <button onClick={cycle} className="kt-theme" style={{ border: `1.5px solid ${T.rule}`, color: T.dim, background: T.surface }}>
          {mode === "auto" ? "Auto" : mode === "day" ? "Day" : "Night"}
        </button>
      </div>
      <Join T={T} onJoin={E.join} syncOn={E.SYNC_ON} room={E.ROOM} />
    </div>
  );

  const stop = E.stops[E.viewing];
  const others = Object.values(E.members).filter((m) => m.id !== E.me.id).sort((a, b) => b.at - a.at);
  const nearest = E.coords ? E.stops.map((s) => ({ s, d: metersBetween(E.coords, s) })).sort((a, b) => a.d - b.d)[0] : null;
  const distToViewing = E.coords ? metersBetween(E.coords, stop) : null;
  const nearPrompt = nearest && nearest.d < NEAR_M && !E.checkins[nearest.s.n] ? nearest : null;
  const dotsFor = (i) => Object.values(E.members).filter((m) => m.at === i).map((m) => m.color);
  const capMsg = E.capacityAlert(stop.n);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: BODY, color: T.text }}>
      <Styles T={T} />
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "20px 16px 40px" }}>

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <Eyebrow color={T.delftHi}>Negen bruine kroegen</Eyebrow>
            <h1 style={{ font: `400 28px/1 ${DISPLAY}`, margin: "8px 0 0", color: T.text }}>De Kroegentocht</h1>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <button onClick={cycle} className="kt-theme"
              style={{ border: `1.5px solid ${T.rule}`, color: T.dim, background: T.surface }}
              aria-label={`Theme: ${mode}. Tap to change.`}>
              {mode === "auto" ? "Auto" : mode === "day" ? "Day" : "Night"}
            </button>
            <div style={{ textAlign: "right", font: `700 14px/1.5 ${MONO}`, color: T.dim }}>
              <div>{E.doneList.length}/9 stops</div>
              <div>{E.startedAt ? elapsed(Date.now() - E.startedAt) : `${(TOTAL_M / 1000).toFixed(1)} km`}</div>
            </div>
          </div>
        </header>

        {/* persistent payment reminder */}
        <div style={{ font: `400 14px/1.4 ${BODY}`, color: T.dim, borderBottom: `1px solid ${T.rule}`, paddingBottom: 10, marginBottom: 16 }}>
          💳 Cash or Dutch PIN — foreign credit cards are often refused in brown cafés.
        </div>

        {/* group size */}
        <div style={{ marginBottom: 14 }}>
          <Eyebrow color={T.dim}>How many of you</Eyebrow>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }} role="group" aria-label="Group size">
            {[["small", "1–4"], ["medium", "5–8"], ["large", "9+"]].map(([k, label]) => {
              const on = E.groupSize === k;
              return (
                <button key={k} onClick={() => E.setGroupSize(k)} aria-pressed={on}
                  style={{
                    flex: 1, minHeight: 48, cursor: "pointer", borderRadius: 3,
                    background: on ? T.accent : T.surface, color: on ? T.onAccent : T.dim,
                    border: `1.5px solid ${on ? T.accent : T.rule}`,
                    font: `700 15px ${BODY}`, letterSpacing: ".06em", textTransform: "capitalize",
                  }}>
                  {k} <span style={{ fontWeight: 400 }}>({label})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* tile trail: 5+4 grid keeps every target ≥48px */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 6 }}>
          {E.stops.map((s, i) => {
            const glazed = !!E.checkins[s.n], here = i === E.current;
            return (
              <button key={s.n} onClick={() => E.setViewing(i)} className="kt-tile"
                aria-label={`Stop ${s.n}, ${s.name}${glazed ? ", visited" : here ? ", current" : ""}`}
                aria-current={here ? "step" : undefined}
                style={{
                  position: "relative", minHeight: 52, borderRadius: 3,
                  border: `1.5px solid ${here ? T.accent : glazed ? T.delftLo : T.rule}`,
                  background: glazed ? `linear-gradient(150deg, ${T.delft}, ${T.delftLo})` : here ? T.surface2 : T.surface,
                  color: glazed ? "#fff" : here ? T.accent : T.dim,
                  font: `700 17px/1 ${MONO}`, cursor: "pointer",
                }}>
                {glazed ? "✓" : s.n}
                {here && <span className="kt-pulse" style={{ position: "absolute", inset: -1.5, borderRadius: 3, border: `1.5px solid ${T.accent}`, pointerEvents: "none" }} />}
                {dotsFor(i).length > 0 && (
                  <span style={{ position: "absolute", bottom: 4, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 3 }}>
                    {dotsFor(i).slice(0, 4).map((c, j) => <span key={j} style={{ width: 5, height: 5, borderRadius: 5, background: c }} />)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", font: `700 12px ${MONO}`, color: T.dim, marginBottom: 18 }}>
          <span>CENTRAAL</span><span>JORDAAN</span>
        </div>

        <div style={{ background: T.surface, border: `1.5px solid ${T.rule}`, borderRadius: 3, padding: 4, marginBottom: 14 }}>
          <RouteMap T={T} stops={E.stops} current={E.current} done={E.doneList} members={E.members} meId={E.me.id} myCoords={E.shareLoc ? null : E.coords} />
        </div>

        {/* location bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", marginBottom: 16, borderRadius: 3,
          background: T.surface, border: `1.5px solid ${T.rule}`, font: `400 15px ${BODY}`, color: T.dim, minHeight: 48, boxSizing: "border-box",
        }}>
          {E.geoState === "on" ? (
            <>
              <span style={{ width: 9, height: 9, borderRadius: 9, background: T.delftHi, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                {nearest && nearest.d < 400
                  ? <>Nearest: <strong style={{ color: T.text }}>{nearest.s.name}</strong>, {nearest.d} m</>
                  : "Located. No stop within 400 m."}
              </span>
              {E.SYNC_ON && (
                <button onClick={() => E.setShareLoc(!E.shareLoc)} className="kt-link" style={{ color: E.shareLoc ? T.accent : T.delftHi }}>
                  {E.shareLoc ? "Sharing" : "Share"}
                </button>
              )}
              <button onClick={E.stopGeo} className="kt-link" style={{ color: T.dim }}>Off</button>
            </>
          ) : E.geoState === "asking" ? <span>Waiting for a fix…</span>
            : E.geoState === "denied" ? <span>Location is off. Check in by hand — everything else works.</span>
              : <>
                <span style={{ flex: 1 }}>Use location to measure distance to the next door.</span>
                <button onClick={E.startGeo} className="kt-link" style={{ color: T.delftHi }}>Turn on</button>
              </>}
        </div>

        {E.rally && (
          <div style={{ padding: 14, marginBottom: 16, borderRadius: 3, background: T.warnBg, border: `1.5px solid ${T.accent}`, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 10, background: E.rally.color, flexShrink: 0 }} />
            <div style={{ flex: 1, font: `400 16px/1.4 ${BODY}`, color: T.text }}>
              {E.rally.mine ? "You called a rally at" : <><strong>{E.rally.name}</strong> calls everyone to</>}{" "}
              <strong>{E.stops[Math.min(E.rally.stop, 8)].name}</strong>
              <span style={{ color: T.dim }}> · {ago(E.rally.ts)}</span>
            </div>
            <button className="kt-link" style={{ color: T.accent }} onClick={E.dismissRally}>
              {E.rally.mine ? "Cancel" : "Got it"}
            </button>
          </div>
        )}

        {E.warning && (
          <div role="alert" style={{ padding: "13px 14px", marginBottom: 16, borderRadius: 3, background: T.warnBg, borderLeft: `4px solid ${T.accent}`, font: `400 16px/1.5 ${BODY}`, color: T.text }}>
            ⏱ {E.warning}
          </div>
        )}

        {E.doneList.length >= 5 && E.doneList.length < 9 && !E.waterOff && (
          <div style={{ padding: "13px 14px", marginBottom: 16, borderRadius: 3, background: T.surface, border: `1.5px dashed ${T.rule}`, display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ flex: 1, font: `400 15px/1.5 ${BODY}`, color: T.dim }}>
              Five down. Water now, and food at stop 8, is what keeps the last four fun.
            </div>
            <button className="kt-link" style={{ color: T.dim }} onClick={E.dismissWater}>Noted</button>
          </div>
        )}

        {nearPrompt && (
          <div style={{ padding: 14, marginBottom: 16, borderRadius: 3, background: T.delftLo, border: `1.5px solid ${T.delft}`, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, font: `400 16px/1.4 ${BODY}`, color: "#fff" }}>
              You're {nearPrompt.d} m from <strong>{nearPrompt.s.name}</strong>.
            </div>
            <button onClick={() => E.checkIn(nearPrompt.s.n)}
              style={{ background: "#fff", color: T.delftLo, border: "none", minHeight: 48, padding: "10px 16px", cursor: "pointer", font: `700 14px ${BODY}`, letterSpacing: ".1em", textTransform: "uppercase", borderRadius: 3 }}>
              Check in
            </button>
          </div>
        )}

        {/* STOP CARD */}
        <article style={{ background: T.surface, border: `1.5px solid ${T.rule}`, borderRadius: 3, padding: "18px 16px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Eyebrow color={E.checkins[stop.n] ? T.delftHi : T.accent}>
              Stop {stop.n} of 9{stop.swapped ? " · backup venue" : ""}{E.checkins[stop.n] ? ` · in at ${clockOf(E.checkins[stop.n])}` : ""}
            </Eyebrow>
            <span style={{ font: `700 14px ${MONO}`, color: T.dim }}>{stop.year || ""}</span>
          </div>

          <h2 style={{ font: `400 27px/1.1 ${DISPLAY}`, margin: "10px 0 4px", color: T.text }}>{stop.name}</h2>
          <div style={{ font: `400 15px ${MONO}`, color: T.dim, marginBottom: 14 }}>
            {stop.addr}{stop.legFrom ? ` · ${stop.swapped ? "≈" : ""}${stop.legFrom} m · ${stop.legMin} min` : " · start here"}
            {distToViewing != null && <strong style={{ color: T.delftHi }}> · {distToViewing} m away</strong>}
          </div>

          {capMsg && (
            <div role="alert" style={{ padding: "12px 13px", marginBottom: 14, borderRadius: 3, background: T.warnBg, borderLeft: `4px solid ${T.accent}`, font: `400 15px/1.5 ${BODY}`, color: T.text }}>
              ⚠️ {capMsg}
            </div>
          )}

          <p style={{ font: `400 17px/1.55 ${BODY}`, margin: "0 0 14px", color: T.text }}>{stop.note}</p>

          {stop.ritual && (
            <div style={{ padding: "12px 13px", marginBottom: 14, borderRadius: 3, background: T.surface2, border: `1.5px solid ${T.rule}`, font: `400 15px/1.5 ${BODY}`, color: T.text }}>
              🥃 <strong>Jenever ritual:</strong> hands behind your back, bow to the bar, and take the first sip straight off the rim. Then pick the glass up like a normal person.
            </div>
          )}

          <div style={{ borderLeft: `3px solid ${stop.pin ? T.accent : T.delft}`, paddingLeft: 12, marginBottom: 14 }}>
            <div style={{ font: `400 16px/1.5 ${BODY}`, color: T.text }}>{stop.order}</div>
            <div style={{ font: `700 14px/1.5 ${MONO}`, color: stop.pin ? T.accent : T.dim, marginTop: 4 }}>{stop.hours}</div>
          </div>

          {SWAPPABLE.includes(stop.n) && (
            <button onClick={() => E.toggleSwap(stop.n)}
              style={{ ...btn(T.surface2, T.text, T.rule), width: "100%", marginBottom: 14, textTransform: "none", letterSpacing: 0, font: `600 16px ${BODY}` }}>
              {stop.swapped ? `↩ Restore ${stop.origName}` : `⇄ Swap to ${ALT_NAME[stop.n]}`}
            </button>
          )}

          {E.checkins[stop.n] && (
            <div style={{ marginBottom: 14, paddingTop: 12, borderTop: `1px solid ${T.rule}` }}>
              <Eyebrow color={T.dim}>What you had here</Eyebrow>
              <div style={{ display: "flex", gap: 8, margin: "10px 0" }}>
                {DRINK_KINDS.map((k) => {
                  const on = E.drinks[stop.n]?.kind === k;
                  return (
                    <button key={k} onClick={() => E.setDrinkKind(stop.n, k)} aria-pressed={on}
                      style={{
                        flex: 1, minHeight: 48, cursor: "pointer", borderRadius: 3,
                        background: on ? T.delft : T.surface, border: `1.5px solid ${on ? T.delft : T.rule}`,
                        color: on ? "#fff" : T.dim, font: `700 14px ${BODY}`, letterSpacing: ".06em", textTransform: "uppercase",
                      }}>
                      {k}
                    </button>
                  );
                })}
              </div>
              <input value={E.drinks[stop.n]?.note || ""} onChange={(e) => E.setDrinkNote(stop.n, e.target.value)}
                placeholder="One line for tomorrow-you" maxLength={60}
                style={{
                  width: "100%", boxSizing: "border-box", minHeight: 48, padding: "10px 12px", borderRadius: 3,
                  background: T.bg, border: `1.5px solid ${T.rule}`, color: T.text, font: `400 16px ${BODY}`, outline: "none",
                }} />
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {E.checkins[stop.n]
              ? <button onClick={() => E.undo(stop.n)} style={btn(T.surface2, T.dim, T.rule)}>Undo check-in</button>
              : <button onClick={() => E.checkIn(stop.n)} style={btn(T.accent, T.onAccent)}>I'm here</button>}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lon}&travelmode=walking`}
              target="_blank" rel="noopener noreferrer"
              style={{ ...btn(T.surface2, T.text, T.rule), textDecoration: "none", textAlign: "center", flex: "0 0 auto", display: "flex", alignItems: "center" }}>
              Walk there
            </a>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <button className="kt-link" onClick={() => E.setViewing(Math.max(0, E.viewing - 1))} disabled={E.viewing === 0}
              style={{ color: E.viewing === 0 ? T.rule : T.delftHi }}>← Previous</button>
            <button className="kt-link" onClick={() => E.setViewing(Math.min(8, E.viewing + 1))} disabled={E.viewing === 8}
              style={{ color: E.viewing === 8 ? T.rule : T.delftHi }}>Next →</button>
          </div>
        </article>

        {/* PARTY */}
        <section style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <Eyebrow color={T.dim}>Walking with you</Eyebrow>
            <span style={{ font: `700 12px ${MONO}`, color: T.dim }}>
              {!E.SYNC_ON ? "solo mode" : E.synced === false ? "offline" : E.synced === null ? "…" : `live · ${E.ROOM}`}
            </span>
          </div>
          <Row T={T} stops={E.stops} m={{ ...E.me, at: E.current, done: E.doneList.length, seen: Date.now() }} isMe />
          {others.map((m) => <Row key={m.id} T={T} stops={E.stops} m={m} />)}
          {E.SYNC_ON && others.length === 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ font: `400 15px/1.5 ${BODY}`, color: T.dim, margin: "0 0 10px" }}>
                Nobody else yet. Send the link — when they put a name in they appear here and on the tiles.
              </p>
              <button onClick={E.copyInvite} style={{ ...btn(T.surface2, T.text, T.rule), width: "100%" }}>
                {E.copied ? "Link copied" : "Copy invite link"}
              </button>
            </div>
          )}
          {!E.SYNC_ON && (
            <p style={{ font: `400 15px/1.5 ${BODY}`, color: T.dim, margin: "10px 0 0" }}>
              Solo mode. Progress saves on this phone. To put friends on the board, add your Supabase keys in index.html — see the README.
            </p>
          )}
          {E.SYNC_ON && others.length > 0 && (
            <button onClick={E.callRally} style={{ ...btn(T.surface2, T.accent, T.rule), width: "100%", marginTop: 12 }}>
              Rally everyone at {stop.name}
            </button>
          )}
        </section>

        {E.doneList.length === 9 && (
          <section style={{ marginBottom: 22, background: T.surface, border: `1.5px solid ${T.accent}`, borderRadius: 3, padding: 16 }}>
            <Eyebrow color={T.accent}>Voltooid — all nine</Eyebrow>
            <p style={{ font: `400 17px/1.5 ${BODY}`, margin: "10px 0 14px", color: T.text }}>
              {E.startedAt ? `${elapsed(Math.max(...Object.values(E.checkins)) - E.startedAt)} from the sand floor at Karpershoek to apple pie at Papeneiland.` : "The full route, done."}
            </p>
            {E.cardUrl ? (
              <>
                <img src={E.cardUrl} alt="Summary card of the finished crawl" style={{ width: "100%", display: "block", marginBottom: 10, borderRadius: 3 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={E.cardUrl} download="kroegentocht.png" style={{ ...btn(T.delft, "#fff"), textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>Save</a>
                  {typeof navigator !== "undefined" && navigator.canShare && (
                    <button onClick={E.shareCard} style={btn(T.surface2, T.text, T.rule)}>Share</button>
                  )}
                </div>
              </>
            ) : (
              <button onClick={E.makeCard} style={{ ...btn(T.accent, T.onAccent), width: "100%" }}>Make the summary card</button>
            )}
          </section>
        )}

        {E.startedAt && E.doneList.length >= 3 && (
          <div style={{ font: `400 14px/1.6 ${MONO}`, color: T.dim, borderTop: `1px solid ${T.rule}`, paddingTop: 14, marginBottom: 12 }}>
            {E.doneList.length} bars in {elapsed(Date.now() - E.startedAt)}.
            {E.doneList.length >= 5 && <span style={{ color: T.accent }}> Vaasjes from here.</span>}
          </div>
        )}

        <footer style={{ font: `400 14px/1.6 ${BODY}`, color: T.dim }}>
          {E.SYNC_ON && <>Anyone with the link to group <span style={{ font: `14px ${MONO}` }}>{E.ROOM}</span> sees the names and progress on this board. Position is only shared while <em>Sharing</em> is lit. </>}
          <button className="kt-link" onClick={E.resetAll} style={{ color: T.dim, textDecoration: "underline" }}>Clear my crawl</button>
          <div style={{ font: `400 13px ${MONO}`, marginTop: 14, opacity: .8 }}>{VERSION}</div>
        </footer>
      </div>
    </div>
  );
}

const SWAPPABLE = [2, 5, 8];
const ALT_NAME = { 2: "De Pilsener Club", 5: "Café De Zwart", 8: "Café Nol" };

function Row({ T, stops, m, isMe }) {
  const at = stops[Math.min(m.at ?? 0, 8)];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 0", borderBottom: `1px solid ${T.rule}`, minHeight: 48, boxSizing: "border-box" }}>
      <span style={{ width: 11, height: 11, borderRadius: 11, background: m.color, flexShrink: 0 }} />
      <span style={{ font: `600 17px ${BODY}`, color: T.text, flexShrink: 0 }}>
        {m.name}{isMe && <span style={{ color: T.dim, fontSize: 14 }}> · you</span>}
      </span>
      <span style={{ flex: 1, textAlign: "right", font: `400 14px ${MONO}`, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {m.done ? at.name : "not started"}
      </span>
      <span style={{ font: `400 13px ${MONO}`, color: T.dim, flexShrink: 0, width: 60, textAlign: "right", opacity: .8 }}>
        {isMe ? "now" : ago(m.seen)}
      </span>
    </div>
  );
}

function Styles({ T }) {
  return (
    <style>{`
      .kt-link { background:none; border:none; padding:10px 8px; margin:-10px -8px; cursor:pointer;
        font:700 14px ${BODY}; letter-spacing:.08em; text-transform:uppercase; min-height:44px; }
      .kt-link:disabled { cursor:default; }
      .kt-theme { min-height:48px; min-width:76px; padding:10px 16px; border-radius:3px; cursor:pointer;
        font:700 14px ${BODY}; letter-spacing:.08em; text-transform:uppercase; }
      .kt-tile:focus-visible, .kt-link:focus-visible, button:focus-visible, a:focus-visible, input:focus-visible {
        outline:3px solid ${T.accent}; outline-offset:2px; }
      input::placeholder { color:${T.dim}; opacity:.7 }
      @keyframes ktPulse { 0%,100% { opacity:.9 } 50% { opacity:.25 } }
      .kt-pulse { animation: ktPulse 2.4s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { .kt-pulse { animation:none } }
    `}</style>
  );
}
