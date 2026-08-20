/* useCrawlEngine.ts — the whole crawl brain, UI-free.
   v2.4.0-build.2026.08 */
import { useState, useEffect, useRef, useCallback } from "react";

export const VERSION = "v2.4.0-build.2026.08";

/* ── route data ────────────────────────────────────────────── */
export const STOPS = [
  { n: 1, name: "Café Karpershoek", year: 1606, addr: "Martelaarsgracht 2",
    lat: 52.3782851, lon: 4.8967176, legFrom: null as number | null, legMin: null as number | null,
    note: "The oldest bar in the city, opened for sailors coming off the harbour. Sand still goes down on the floor to soak up spilled beer.",
    order: "A vaasje — small pilsner, two fingers of foam.", hours: "Daily from 10:00" },
  { n: 2, name: "In 't Aepjen", year: 1519, addr: "Zeedijk 1",
    lat: 52.3762704, lon: 4.9001675, legFrom: 400, legMin: 5,
    note: "One of only two medieval wooden houses left standing. Broke sailors paid for lodging with monkeys brought back from the Indies — still the Dutch phrase for being in a bad spot.",
    order: "Aepjen bier. Room for about twenty people, so go at opening.",
    hours: "Daily from 14:00", capacity: 20 },
  { n: 3, name: "Wynand Fockink", year: 1679, addr: "Pijlsteeg 31",
    lat: 52.372311, lon: 4.895329, legFrom: 750, legMin: 10,
    note: "Not a pub but a proeflokaal — a distillery tasting room. The glass is poured to the meniscus.",
    order: "Oude jenever. Ask them to pick.", hours: "Daily 14:00–21:00", ritual: true },
  { n: 4, name: "De Drie Fleschjes", year: 1650, addr: "Gravenstraat 18",
    lat: 52.3742843, lon: 4.8923114, legFrom: 450, legMin: 6,
    note: "Hidden in the alley behind the Nieuwe Kerk. The back wall is numbered private casks belonging to Amsterdam firms, some held for generations.",
    order: "A korenwijn, if they have it open.", hours: "Mon–Sat 14:00–20:30 · Sun 15:00–19:00", ritual: true },
  { n: 5, name: "Café de Dokter", year: 1798, addr: "Rozenboomsteeg 4",
    lat: 52.3692539, lon: 4.8908111, legFrom: 700, legMin: 9,
    note: "Smallest bar in Amsterdam — fourteen seats, same family since it opened. Vinyl only, candlelight, dust on the chandeliers kept as a point of pride.",
    order: "The gin and tonic. Let them put ginger in it.",
    hours: "Wed–Sat from 16:00 only", pin: true, capacity: 14 },
  { n: 6, name: "Hoppe", year: 1670, addr: "Spui 18",
    lat: 52.3688139, lon: 4.8886278, legFrom: 200, legMin: 3,
    note: "The most famous brown café in the country. Two doors side by side — take the right-hand one for the original standing bar with the sand floor.",
    order: "Stand up. Nobody sits in the right-hand bar.", hours: "Daily from 09:00" },
  { n: 7, name: "Café Chris", year: 1624, addr: "Bloemstraat 42",
    lat: 52.3742752, lon: 4.8816114, legFrom: 950, legMin: 12,
    note: "Oldest bar in the Jordaan. The story goes that the men building the Westerkerk collected their wages here and drank them on the spot.",
    order: "Whatever's on the middle tap.", hours: "Daily from 12:00" },
  { n: 8, name: "Café 't Smalle", year: 1786, addr: "Egelantiersgracht 12",
    lat: 52.3767128, lon: 4.8841696, legFrom: 400, legMin: 5,
    note: "Started life as Pieter Hoppe's jenever distillery. The pontoon terrace over the canal is the best drinking spot in Amsterdam. Good moment to eat.",
    order: "Smoked sausage sandwich, bitterballen for the table.", hours: "Daily from 14:00" },
  { n: 9, name: "Café Papeneiland", year: 1642, addr: "Prinsengracht 2",
    lat: 52.3804627, lon: 4.8879704, legFrom: 600, legMin: 8,
    note: "Named for the hidden Catholic church across the water, with a persistent story of a tunnel beneath the canal. Delft tiles, a stove in the middle of the room.",
    order: "Appeltaart met slagroom. Centraal is ten minutes east.", hours: "Daily from 10:00" },
];

/* Quick-swap backups. Note: the brief proposed Hoppe as the De Dokter
   backup, but Hoppe is already stop 6 — swapping would visit it twice.
   De Zwart is the classic directly across the Spui: same square, more
   room, no duplicate. */
export const SWAP_ALTS: Record<number, any> = {
  2: { name: "De Pilsener Club", year: 1893, addr: "Begijnensteeg 4 (\u201cEngelse Reet\u201d)",
       lat: 52.3699, lon: 4.8906,
       note: "The living-room beer café behind Kalverstraat: sawdust, no music, conversation only. Fits a group that In 't Aepjen can't.",
       order: "Osseworst and old cheese with mustard. Bitterballen if hungry.",
       hours: "Daily from 12:00" },
  5: { name: "Café De Zwart", addr: "Spuistraat 334",
       lat: 52.3690, lon: 4.8890,
       note: "Directly across the Spui from Hoppe and the locals' quieter pick of the pair. Takes a group De Dokter's fourteen seats never could.",
       order: "A pils at the reading table.", hours: "Daily from 11:00" },
  8: { name: "Café Nol", addr: "Westerstraat 109",
       lat: 52.3776, lon: 4.8818,
       note: "The Jordaan's pink-lit sing-along institution. Louder and roomier than 't Smalle's pontoon — the right trade for a big group at night.",
       order: "Whatever the bar sings about.", hours: "Evenings, from ~21:00" },
};

export const DRINK_KINDS = ["Bier", "Jenever", "Anders"];
export const RALLY_TTL = 30 * 60 * 1000;
export const NEAR_M = 75;
export const CLOSES: Record<number, number> = { 3: 21 * 60, 4: 20 * 60 + 30 };
export const TOTAL_M = STOPS.reduce((a, s) => a + (s.legFrom || 0), 0);
export const ANCHOR = { lat: 52.3791, lon: 4.9003, name: "Centraal" };
export const MEMBER_COLORS = ["#C9A227", "#8E4A46", "#6E8B6B", "#B87333", "#7A6AA8", "#3E6FA8"];

export type GroupSize = "small" | "medium" | "large";
/* Dwell scaling: brief specifies +15 min/stop for groups over five;
   large groups compound (two rounds of ordering, split tables), so
   large doubles it. */
const DWELL_EXTRA: Record<GroupSize, number> = { small: 0, medium: 15, large: 30 };
const BASE_STOP_MIN = 32; // drink + walk, observed pace replaces this after 2 check-ins

/* ── config ────────────────────────────────────────────────── */
const CFG = (typeof window !== "undefined" && (window as any).KROEG_CONFIG) || {};
export const SYNC_ON = !!(CFG.supabaseUrl && CFG.supabaseKey);
export const ROOM = (() => {
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("room") : null;
  return (q || CFG.room || "amsterdam").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || "amsterdam";
})();

/* ── helpers ───────────────────────────────────────────────── */
export function metersBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
export function ago(ts: number) {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
export const clockOf = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
export function elapsed(ms: number) {
  const m = Math.floor(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}
const newId = () =>
  typeof crypto !== "undefined" && (crypto as any).randomUUID
    ? (crypto as any).randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

const local = {
  get(k: string) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k: string, v: any) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};

const sb = {
  url: (CFG.supabaseUrl || "").replace(/\/$/, ""),
  key: CFG.supabaseKey || "",
  h(extra?: any) {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...extra };
  },
  async upsert(table: string, conflict: string, row: any) {
    if (!SYNC_ON) return false;
    const r = await fetch(`${this.url}/rest/v1/${table}?on_conflict=${conflict}`, {
      method: "POST", headers: this.h({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify([row]),
    });
    return r.ok;
  },
  async select(table: string, query: string) {
    if (!SYNC_ON) return null;
    const r = await fetch(`${this.url}/rest/v1/${table}?${query}`, { headers: this.h() });
    return r.ok ? await r.json() : null;
  },
};

/* ── the engine ────────────────────────────────────────────── */
export function useCrawlEngine() {
  const [me, setMe] = useState<any>(null);
  const [members, setMembers] = useState<Record<string, any>>({});
  const [checkins, setCheckins] = useState<Record<number, number>>({});
  const [drinks, setDrinks] = useState<Record<number, any>>({});
  const [myRally, setMyRally] = useState<any>(null);
  const [rallyDismissed, setRallyDismissed] = useState(0);
  const [waterOff, setWaterOff] = useState(false);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [viewing, setViewing] = useState(0);
  const [coords, setCoords] = useState<any>(null);
  const [geoState, setGeoState] = useState<"off" | "asking" | "on" | "denied">("off");
  const [shareLoc, setShareLoc] = useState(false);
  const [booted, setBooted] = useState(false);
  const [synced, setSynced] = useState<boolean | null>(SYNC_ON ? null : false);
  const [copied, setCopied] = useState(false);
  const [groupSize, setGroupSizeState] = useState<GroupSize>("small");
  const [swaps, setSwapsState] = useState<Record<number, boolean>>({});
  const sessionTs = useRef(0);
  const watchId = useRef<number | null>(null);
  const stateRef = useRef<any>({});

  const doneList = Object.keys(checkins).map(Number).sort((a, b) => a - b);
  const current = Math.min(doneList.length, 8);
  const startedAt = doneList.length ? Math.min(...Object.values(checkins)) : null;

  /* effective route with swaps applied */
  const stops = STOPS.map((s) =>
    swaps[s.n] && SWAP_ALTS[s.n]
      ? { ...s, ...SWAP_ALTS[s.n], n: s.n, legFrom: s.legFrom, legMin: s.legMin, swapped: true, origName: s.name }
      : { ...s, swapped: false }
  );

  stateRef.current = { me, checkins, current, coords, shareLoc, myRally, groupSize, swaps };

  /* boot */
  useEffect(() => {
    const saved = local.get("kroeg:me");
    if (saved?.id) {
      setMe({ id: saved.id, name: saved.name, color: saved.color });
      setCheckins(saved.checkins || {});
      setDrinks(saved.drinks || {});
      setViewing(Math.min(Object.keys(saved.checkins || {}).length, 8));
    }
    const sess = local.get("kroeg:session");
    if (sess) { setGroupSizeState(sess.groupSize || "small"); setSwapsState(sess.swaps || {}); sessionTs.current = sess.ts || 0; }
    if (local.get("kroeg:water")) setWaterOff(true);
    setBooted(true);
  }, []);

  /* heartbeat: party row + session row, both directions */
  const beat = useCallback(async () => {
    const { me: m, checkins: ci, current: cur, coords: co, shareLoc: sl, myRally: ra, groupSize: gs, swaps: sw } = stateRef.current;
    if (!m || !SYNC_ON) return;
    try {
      const ok = await sb.upsert("party", "id", {
        id: m.id, room: ROOM, name: m.name, color: m.color, stop_idx: cur,
        done_count: Object.keys(ci).length,
        last_in: Object.keys(ci).length ? Math.max(...(Object.values(ci) as number[])) : null,
        seen: Date.now(),
        lat: sl && co ? +co.lat.toFixed(5) : null,
        lon: sl && co ? +co.lon.toFixed(5) : null,
        rally_stop: ra ? ra.stop : null,
        rally_ts: ra ? ra.ts : null,
      });
      const rows = await sb.select("party", `room=eq.${encodeURIComponent(ROOM)}&seen=gt.${Date.now() - 8 * 3600 * 1000}&select=*`);
      if (rows) {
        const next: Record<string, any> = {};
        for (const r of rows) {
          next[r.id] = {
            id: r.id, name: r.name, color: r.color, at: r.stop_idx, done: r.done_count,
            last: r.last_in, seen: Number(r.seen),
            coords: r.lat != null && r.lon != null ? { lat: r.lat, lon: r.lon } : null,
            rally: r.rally_ts ? { stop: r.rally_stop, ts: Number(r.rally_ts) } : null,
          };
        }
        setMembers(next);
      }
      /* session: last writer wins; only push if mine is newer */
      const sess = await sb.select("crawl_sessions", `room=eq.${encodeURIComponent(ROOM)}&select=*`);
      const remote = sess && sess[0];
      if (remote && Number(remote.updated_at) > sessionTs.current) {
        sessionTs.current = Number(remote.updated_at);
        setGroupSizeState(remote.group_size || "small");
        setSwapsState(remote.swaps || {});
        local.set("kroeg:session", { groupSize: remote.group_size, swaps: remote.swaps, ts: sessionTs.current });
      } else if (!remote || Number(remote.updated_at) < sessionTs.current) {
        await sb.upsert("crawl_sessions", "room", { room: ROOM, group_size: gs, swaps: sw, updated_at: sessionTs.current || Date.now() });
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

  useEffect(() => { if (me) local.set("kroeg:me", { ...me, checkins, drinks }); }, [me, checkins, drinks]);

  const pushSession = (gs: GroupSize, sw: Record<number, boolean>) => {
    sessionTs.current = Date.now();
    local.set("kroeg:session", { groupSize: gs, swaps: sw, ts: sessionTs.current });
    if (SYNC_ON) sb.upsert("crawl_sessions", "room", { room: ROOM, group_size: gs, swaps: sw, updated_at: sessionTs.current }).catch(() => {});
  };
  const setGroupSize = (gs: GroupSize) => { setGroupSizeState(gs); pushSession(gs, stateRef.current.swaps); };
  const toggleSwap = (n: number) => {
    const sw = { ...stateRef.current.swaps, [n]: !stateRef.current.swaps[n] };
    if (!sw[n]) delete sw[n];
    setSwapsState(sw); pushSession(stateRef.current.groupSize, sw);
  };

  /* wake lock while navigating */
  useEffect(() => {
    if (geoState !== "on" || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: any = null;
    const grab = () => (navigator as any).wakeLock.request("screen").then((l: any) => { lock = l; }).catch(() => {});
    grab();
    const vis = () => { if (document.visibilityState === "visible") grab(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); try { lock && lock.release(); } catch {} };
  }, [geoState]);

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

  const join = (name: string, color: string) => {
    const m = { id: newId(), name, color };
    setMe(m); setCheckins({}); setDrinks({}); setViewing(0);
    local.set("kroeg:me", { ...m, checkins: {}, drinks: {} });
  };
  const checkIn = (n: number) => {
    setCheckins((prev) => (prev[n] ? prev : { ...prev, [n]: Date.now() }));
    setViewing(n - 1);
    try { (navigator as any).vibrate && (navigator as any).vibrate(30); } catch {}
    setTimeout(beat, 200);
  };
  const undo = (n: number) => setCheckins((prev) => { const c = { ...prev }; delete c[n]; return c; });
  const setDrinkKind = (n: number, kind: string) =>
    setDrinks((prev) => ({ ...prev, [n]: { ...(prev[n] || {}), kind: prev[n]?.kind === kind ? null : kind } }));
  const setDrinkNote = (n: number, note: string) =>
    setDrinks((prev) => ({ ...prev, [n]: { ...(prev[n] || {}), note: note.slice(0, 60) } }));
  const callRally = () => {
    setMyRally({ stop: viewing, ts: Date.now() });
    try { (navigator as any).vibrate && (navigator as any).vibrate([30, 40, 30]); } catch {}
    setTimeout(beat, 200);
  };
  const dismissWater = () => { setWaterOff(true); local.set("kroeg:water", true); };
  const resetAll = () => {
    setCheckins({}); setDrinks({}); setMyRally(null); setViewing(0);
    if (cardUrl) { try { URL.revokeObjectURL(cardUrl); } catch {} setCardUrl(null); }
    if (me) local.set("kroeg:me", { ...me, checkins: {}, drinks: {} });
    setTimeout(beat, 200);
  };
  const copyInvite = async () => {
    const url = `${location.origin}${location.pathname}?room=${ROOM}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt("Copy this link:", url); }
  };

  /* ── schedule guard: closing times × pace × group-size dwell ── */
  let warning: string | null = null;
  {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dow = now.getDay();
    const extra = DWELL_EXTRA[groupSize];
    const perStop = doneList.length >= 2 && startedAt
      ? (Math.max(...(Object.values(checkins) as number[])) - startedAt) / (doneList.length - 1) / 60000 + extra
      : BASE_STOP_MIN + extra;
    if (!checkins[5] && !swaps[5] && ![3, 4, 5, 6].includes(dow)) {
      warning = "De Dokter is closed today — it runs Wednesday to Saturday only. Use the quick-swap on stop 5 or accept eight of nine.";
    } else if (!checkins[5] && !swaps[5] && current >= 4 && nowMin < 16 * 60) {
      warning = "De Dokter doesn't open until 16:00 — you're ahead of it. Stretch a round at De Drie Fleschjes.";
    } else {
      for (const [nStr, closeMin] of Object.entries(CLOSES)) {
        const n = +nStr;
        if (checkins[n]) continue;
        const away = n - doneList.length;
        if (away <= 0) continue;
        const eta = new Date(Date.now() + away * perStop * 60000);
        const etaMin = eta.getHours() * 60 + eta.getMinutes();
        if (etaMin > closeMin - 20 && etaMin < closeMin + 180) {
          const hh = Math.floor(closeMin / 60), mm = String(closeMin % 60).padStart(2, "0");
          warning = `At ${groupSize === "small" ? "this pace" : `a ${groupSize}-group pace`} you reach ${STOPS[n - 1].name} around ${clockOf(+eta)} — it closes at ${hh}:${mm}. Tighten up or reorder.`;
          break;
        }
      }
    }
  }

  /* capacity alert for the intimate rooms */
  const capacityAlert = (n: number): string | null => {
    const base = STOPS[n - 1] as any;
    if (!base.capacity || swaps[n] || groupSize === "small") return null;
    return `~${base.capacity} places inside. A ${groupSize} group won't fit together — the quick-swap below holds everyone.`;
  };

  /* rally resolution */
  const allRallies = [
    ...(myRally && me ? [{ name: me.name, color: me.color, mine: true, ...myRally }] : []),
    ...Object.values(members).filter((m: any) => me && m.id !== me.id && m.rally).map((m: any) => ({ name: m.name, color: m.color, mine: false, ...m.rally })),
  ].filter((r: any) => Date.now() - r.ts < RALLY_TTL && r.ts > rallyDismissed);
  const rally = (allRallies as any[]).sort((a, b) => b.ts - a.ts)[0] || null;
  const dismissRally = () => { if (rally) { setRallyDismissed(rally.ts); if (rally.mine) setMyRally(null); } };

  /* summary card */
  const makeCard = async () => {
    const cv = document.createElement("canvas");
    cv.width = 1080; cv.height = 1080;
    const g = cv.getContext("2d")!;
    const MONO = "ui-monospace,Menlo,monospace", BODY = "'Avenir Next',system-ui,sans-serif", DISPLAY = "Georgia,serif";
    g.fillStyle = "#12171F"; g.fillRect(0, 0, 1080, 1080);
    g.strokeStyle = "#2F3E4F"; g.lineWidth = 2; g.strokeRect(40, 40, 1000, 1000);
    const tw = 88, gap = 14, x0 = (1080 - (9 * tw + 8 * gap)) / 2, y0 = 120;
    const grad = g.createLinearGradient(0, y0, 0, y0 + tw);
    grad.addColorStop(0, "#3E6FA8"); grad.addColorStop(1, "#274A72");
    g.textAlign = "center";
    STOPS.forEach((_s, i) => {
      const x = x0 + i * (tw + gap);
      g.fillStyle = grad; g.fillRect(x, y0, tw, tw);
      g.strokeStyle = "#89B0D8"; g.lineWidth = 1; g.strokeRect(x + .5, y0 + .5, tw - 1, tw - 1);
      g.fillStyle = "#fff"; g.font = `600 42px ${MONO}`;
      g.fillText("✓", x + tw / 2, y0 + tw / 2 + 15);
    });
    g.fillStyle = "#89B0D8"; g.font = `600 24px ${BODY}`;
    g.fillText("N E G E N   B R U I N E   K R O E G E N", 540, 300);
    g.fillStyle = "#E6E0D0"; g.font = `400 88px ${DISPLAY}`;
    g.fillText("De Kroegentocht", 540, 400);
    g.fillStyle = "#9AA3A9"; g.font = `400 32px ${BODY}`;
    g.fillText(new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }), 540, 456);
    const drinkCount = Object.values(drinks).filter((d: any) => d && d.kind).length;
    const lines = [
      `9 bars · ${(TOTAL_M / 1000).toFixed(1)} km on foot`,
      startedAt ? `${elapsed(Math.max(...(Object.values(checkins) as number[])) - startedAt)} door to door` : "",
      drinkCount ? `${drinkCount} drinks logged` : "",
    ].filter(Boolean);
    g.fillStyle = "#E6E0D0"; g.font = `400 40px ${DISPLAY}`;
    lines.forEach((l, i) => g.fillText(l as string, 540, 570 + i * 62));
    const finishers = [me.name, ...Object.values(members).filter((m: any) => m.id !== me.id && m.done === 9).map((m: any) => m.name)];
    g.fillStyle = "#C9A227"; g.font = `600 22px ${BODY}`;
    g.fillText("V O L T O O I D", 540, 810);
    g.fillStyle = "#E6E0D0"; g.font = `400 36px ${BODY}`;
    g.fillText(finishers.join("  ·  "), 540, 862);
    g.fillStyle = "#9AA3A9"; g.font = `400 26px ${MONO}`;
    g.fillText("1519 — 1798 · Centraal → Jordaan", 540, 970);
    const blob: Blob | null = await new Promise((r) => cv.toBlob(r as any, "image/png"));
    if (blob) setCardUrl(URL.createObjectURL(blob));
  };
  const shareCard = async () => {
    if (!cardUrl) return;
    try {
      const blob = await (await fetch(cardUrl)).blob();
      const file = new File([blob], "kroegentocht.png", { type: "image/png" });
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: "De Kroegentocht" });
      }
    } catch {}
  };

  return {
    VERSION, ROOM, SYNC_ON, booted, synced,
    me, join, members, checkins, drinks, doneList, current, startedAt,
    viewing, setViewing, checkIn, undo, setDrinkKind, setDrinkNote,
    coords, geoState, startGeo, stopGeo, shareLoc, setShareLoc,
    groupSize, setGroupSize, swaps, toggleSwap, stops,
    warning, capacityAlert, rally, callRally, dismissRally,
    waterOff, dismissWater, cardUrl, makeCard, shareCard,
    resetAll, copied, copyInvite,
  };
}
