# De Kroegentocht

A walking tour of the nine oldest brown cafés in Amsterdam. One HTML file, no build
step, no dependencies to install. Works offline once loaded.

- Tile strip across the top is the progress trail — tiles glaze blue as you check in
- Inline SVG map, no tile server, so it renders with no signal
- Optional GPS: measures distance to the next door and offers a check-in within 75 m
- Optional group board: everyone walking together sees the same tiles

---

## 1. Put it on GitHub Pages (2 minutes)

1. Make a new **public** repository. (Pages needs a public repo on a free account —
   private-repo Pages requires a paid plan.)
2. Upload `index.html` to the root of the repo.
3. **Settings → Pages → Build and deployment.** Source: *Deploy from a branch*.
   Branch: `main`, folder: `/ (root)`. Save.
4. Wait ~60 seconds. It's live at `https://YOURNAME.github.io/REPO/`.

That URL is HTTPS, which is what browser geolocation requires — so the GPS features
work properly here, unlike inside an embedded preview frame.

At this point the app is in **solo mode**: everything works, progress is saved on the
phone in `localStorage` and survives closing the browser. Friends just won't appear.
If that's all your friend needs, you're done.

---

## 2. Turn on the group board (10 minutes, free)

GitHub Pages is static hosting — no server, no database. So the shared board needs one
external service. Supabase's free tier covers this many times over.

**Create the project**

1. Sign up at supabase.com, create a project (any region near Europe).
2. Open the **SQL Editor** and run:

```sql
create table party (
  id          text primary key,
  room        text not null,
  name        text,
  color       text,
  stop_idx    int,
  done_count  int,
  last_in     bigint,
  seen        bigint,
  lat         float8,
  lon         float8
);

create index party_room_seen on party (room, seen);

alter table party enable row level security;

create policy "crawl board is open"
  on party for all
  to anon
  using (true) with check (true);
```

3. **Settings → API.** Copy the *Project URL* and the *anon public* key.

**Wire it up**

Open `index.html`, find the `KROEG_CONFIG` block near the top (it's the only part
meant to be edited), and fill in:

```js
window.KROEG_CONFIG = {
  supabaseUrl: "https://abcdefgh.supabase.co",
  supabaseKey: "eyJhbGciOi...",
  room: "amsterdam"
};
```

Commit. The board goes live within a minute.

The anon key is designed to be published in client code — that's its purpose. But note
the policy above is deliberately open: anyone who reads your JS could write rows to
that table. For a pub crawl among friends that's the right trade. If it ever matters,
add a shared secret column and check it in the policy.

---

## 3. Rooms

Each group is a `room`. The default comes from the config, but the URL wins:

```
https://yourname.github.io/kroeg/?room=jonas-trip
```

Anyone opening that link joins that group and nobody else's. The **Copy invite link**
button inside the app produces exactly this URL. Room names are lowercased and
stripped to letters, numbers and hyphens.

---

## Notes

- **Offline.** Once the page has loaded it keeps working with no signal — check-ins,
  map, GPS distances all run locally. Only the group sync pauses, and it catches up
  when data returns. Worth loading once on hotel wifi before heading out.
- **Add to home screen.** On iOS Safari: Share → Add to Home Screen. It then opens
  full-screen like an app.
- **Location.** Nothing is transmitted unless *Sharing* is lit. GPS-off still gives you
  the full tour with manual check-ins.
- **Editing the route.** The `STOPS` array is baked into the bundle. To change stops,
  edit `src/app.jsx` and rebuild:
  `npx esbuild src/app.jsx --bundle --minify --format=iife --jsx=automatic --outfile=build/bundle.js`
  then re-run `assemble.py`. Source is included alongside this file.
- **Cost.** GitHub Pages free, Supabase free tier. A nine-stop crawl for six people is
  a few hundred rows.

---

## Route reference

| # | Bar | Est. | From last | Notes |
|---|-----|------|-----------|-------|
| 1 | Café Karpershoek | 1606 | start | Opens 10:00 |
| 2 | In 't Aepjen | 1519 | 400 m | Opens 14:00 |
| 3 | Wynand Fockink | 1679 | 750 m | Closes 21:00 |
| 4 | De Drie Fleschjes | 1650 | 450 m | Closes 20:30 |
| 5 | Café de Dokter | 1798 | 700 m | **Wed–Sat, from 16:00 only** |
| 6 | Hoppe | 1670 | 200 m | Right-hand door |
| 7 | Café Chris | 1624 | 950 m | Opens 12:00 |
| 8 | Café 't Smalle | 1786 | 400 m | Opens 14:00 |
| 9 | Café Papeneiland | 1642 | 600 m | 10 min back to Centraal |

4.45 km walking, about an hour of it. Stop 5 is the constraint — the whole route only
works Wednesday to Saturday, starting early afternoon. Check opening hours before the
trip; small bars change them.
