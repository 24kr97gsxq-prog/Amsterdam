# De Kroegentocht — v2.4.0-build.2026.08

Amsterdam historical pub crawl web app. Zero budget: GitHub Pages (public repo)
for hosting, Supabase free tier (anon key only, RLS on) for the shared board.
Ships as one self-contained `index.html` — React is compiled in, no build step
needed to deploy.

## Features

- **Tile trail** — 9 tiles in a 5+4 grid (every touch target ≥48px), glazing
  Delft blue as stops are checked in; friends' dots appear on their tile
- **Accessible theming** — Auto/Day/Night toggle in the header, follows
  `prefers-color-scheme` on Auto. Light: `#F4F1EA`/`#FFFFFF`/`#0F172A`, burnt
  amber `#C2410C`. Dark: `#090D12`/`#161F28`/`#F8FAFC`, high-vis amber
  `#F97316`. Body text ≥17–18px throughout, designed for reading glasses in
  dim bars and direct sun
- **Group-size engine** — small (1–4) / medium (5–8) / large (9+), synced to
  the whole room. Medium adds +15 min dwell per stop, large +30, feeding the
  schedule guard
- **Schedule guard** — warns when the projected pace misses Wynand Fockink
  (closes 21:00) or De Drie Fleschjes (20:30), and when De Dokter is closed
  (Sun–Tue) or not yet open (before 16:00)
- **Capacity alerts + quick-swaps** — In 't Aepjen (~20 seats) and De Dokter
  (14 seats) flag medium/large groups; one tap swaps to De Pilsener Club,
  Café De Zwart, or Café Nol (stop 8), for everyone in the room at once.
  *Design note: the original spec proposed Hoppe as De Dokter's backup, but
  Hoppe is already stop 6 — De Zwart, directly across the Spui, avoids
  visiting the same bar twice.*
- **Local culture tips** — jenever ritual card on stops 3–4 (hands behind
  back, bow, sip from the rim), osseworst/cheese/bitterballen food notes,
  Papeneiland apple pie, and a persistent cash/PIN payment reminder (foreign
  credit cards are often refused)
- **Everything from earlier versions** — GPS distance + auto check-in inside
  75 m, opt-in position sharing, rally button, drink log (device-only, never
  synced), water nudge after stop 5, end-of-crawl PNG summary card, haptics,
  wake lock, offline-capable inline SVG map
- **Version footer** on every screen

## Deploy (GitHub Pages)

1. Public repo → upload `index.html` to the root
2. Settings → Pages → Deploy from branch → `main` / root
3. Live at `https://YOU.github.io/REPO/` in ~60 s

Solo mode works immediately with zero configuration.

## Group board (Supabase free tier)

1. Create a project at supabase.com, open the SQL Editor, run `supabase.sql`
   (included next to this file)
2. Settings → API → copy Project URL + anon public key
3. Paste both into `window.KROEG_CONFIG` at the top of `index.html`

Security model: anon key only — it is designed to be public. Row Level
Security is enabled with policies constrained by CHECK clauses (room format,
name length, coordinate bounds, value ranges), so writes are bounded but
**anyone with the link can write rows**. That is the honest trade of a
serverless zero-budget group app; fine for friends, not for anything
sensitive. No service-role key exists anywhere in this code or repo.

Rooms: `?room=jonas-trip` isolates groups; the in-app "Copy invite link"
button generates it. Group size and venue swaps are shared per room
(last-writer-wins); drink logs never leave the phone.

## Source layout

- `src/useCrawlEngine.ts` — all state, Supabase sync, dwell/pace math, swaps
- `src/CrawlDashboard.jsx` — themed accessible UI
- `src/app.jsx` — entry point
- `supabase.sql` — schema, RLS policies, realtime publication
- Rebuild: `npx esbuild src/app.jsx --bundle --minify --format=iife
  --loader:.ts=ts --jsx=automatic --outfile=build/bundle.js` then
  `python3 assemble.py`

## Route

| # | Bar | Est. | From last | Constraint |
|---|-----|------|-----------|------------|
| 1 | Café Karpershoek | 1606 | start | opens 10:00 |
| 2 | In 't Aepjen ⇄ De Pilsener Club | 1519 | 400 m | ~20 seats |
| 3 | Wynand Fockink | 1679 | 750 m | **closes 21:00** |
| 4 | De Drie Fleschjes | 1650 | 450 m | **closes 20:30** |
| 5 | Café de Dokter ⇄ Café De Zwart | 1798 | 700 m | Wed–Sat from 16:00 · 14 seats |
| 6 | Hoppe | 1670 | 200 m | right-hand door |
| 7 | Café Chris | 1624 | 950 m | opens 12:00 |
| 8 | Café 't Smalle ⇄ Café Nol | 1786 | 400 m | food stop |
| 9 | Café Papeneiland | 1642 | 600 m | apple pie · 10 min to Centraal |

4.45 km. Friday plan: start 13:00–14:00, be through stop 4 by ~19:30 with a
medium group, or the closing-time guard will start shouting.
