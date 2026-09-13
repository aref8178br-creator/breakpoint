# StayEasy — Hotel Booking Platform

A hotel search & booking demo platform: Express + SQLite backend, vanilla JS frontend.

## Stack

- **Backend:** Node.js, Express 5, better-sqlite3 (WAL mode + FTS5 full-text search)
- **Validation:** Zod
- **Security:** Helmet, CORS allow-list, express-rate-limit
- **Logging:** Pino (structured JSON in production, pretty-printed in dev)
- **Frontend:** Vanilla HTML/CSS/JS (no framework, no build step)
- **Tests:** Jest + Supertest

## Getting started

```bash
npm install
cp .env.example .env   # adjust values as needed
npm run dev             # http://127.0.0.1:3000, auto-restarts on change
```

Production:

```bash
npm install --omit=dev
# set real environment variables (see "Configuration" below) —
# NODE_ENV=production and ALLOWED_ORIGINS are required.
npm start
```

## Configuration

All environment variables are validated at boot in `config/env.js` — the process
refuses to start with a clear error message if something required is missing or
malformed, rather than failing confusingly later.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test` |
| `PORT` | no | `3000` | |
| `HOST` | no | `127.0.0.1` | |
| `ALLOWED_ORIGINS` | **yes, in production** | — | Comma-separated CORS allow-list |
| `LOG_LEVEL` | no | `debug` (dev) / `info` (prod) | pino levels |
| `ALLOW_DB_RESET` | no | `false` | See "Database" below — leave `false` in production |
| `RATE_LIMIT_WINDOW_MS` | no | `900000` (15 min) | General API rate limit window |
| `RATE_LIMIT_MAX` | no | `100` | Requests per window per IP |

See `.env.example` for a ready-to-copy template.

## Database

On first boot, if the `hotels` table doesn't exist or is empty, the app creates
the schema and seeds it from the CSV files in the project root (`hotels.csv`,
`rooms.csv`, `room_prices.csv`, `amenities.csv`, `hotel_room_amenities.csv`,
`images.csv`).

**Safety rule:** if the database already holds data, boot is a no-op — the app
will *not* drop or reseed it. The only way to force a reset is to explicitly
set `ALLOW_DB_RESET=true`, which is intended for local development only. This
prevents an accidental production restart/redeploy from wiping real data.

The schema uses a SQLite FTS5 virtual table (`hotels_fts`) kept in sync with
the `hotels` table via triggers, powering the search endpoint (see below).

## Search

`GET /api/hotels?search=...` is backed by SQLite's **FTS5** full-text index
(not `LIKE '%...%'`), giving prefix matching, tokenization, and relevance
ranking that scales with the catalog instead of degrading into a full table
scan.

User input never reaches SQL directly. It passes through
`utils/searchQuery.js`, which:

- Splits input into words, keeping any Unicode letters/digits (so Persian,
  Arabic, etc. work correctly) and discarding everything else.
- Drops FTS5 boolean operator keywords (`AND`/`OR`/`NOT`/`NEAR`) so a query
  like "hotel and spa" is treated as three literal words, not boolean logic.
- Quotes every term itself, neutralizing any residual FTS5 special
  characters (quotes, colons, parens, `*`) so malformed input can never
  throw a syntax error or be interpreted as a query directive.
- Caps the number of terms (8) and each term's length (50 chars) against
  pathological input (e.g. a pasted paragraph).

This is unit-tested directly (`tests/searchQuery.test.js`) against SQL
injection–shaped input, FTS operator keywords, unbalanced quotes, Persian
text, and oversized input — and tested again at the HTTP layer
(`tests/hotels.search.test.js`) to confirm the API never 500s on bad search
input and never corrupts data.

`GET /api/hotels/suggest?q=...` is a lightweight, separate autocomplete
endpoint (id/name/city/country only, ranked by relevance) for
search-as-you-type UI, kept cheap by skipping the price/image joins the main
listing endpoint does.

Both search endpoints sit behind a stricter rate limit
(`middleware/rateLimit.js`) than the rest of the API, since search-as-you-type
fires a request per keystroke.

## API overview

| Method | Route | Notes |
|---|---|---|
| GET | `/api/health` | Liveness check (DB ping) |
| GET | `/api/hotels` | Search/filter/sort/paginate. See query params below. |
| GET | `/api/hotels/suggest?q=` | Autocomplete |
| GET | `/api/hotels/:id` | Hotel detail |
| GET | `/api/hotels/:id/rooms` | Rooms for a hotel |
| GET | `/api/hotels/:id/amenities` | Hotel-level amenities |
| GET | `/api/hotels/:id/images` | Gallery images |
| GET | `/api/hotels/:id/prices` | Per-date price calendar |
| GET | `/api/hotels/cities` | Distinct city list |
| GET | `/api/hotels/countries` | Distinct country list |
| GET | `/api/hotels/amenities` | Full amenity reference list |
| GET | `/api/rooms/:id` | Room detail |
| GET | `/api/rooms/:id/prices` | Per-date prices for one room |
| GET | `/api/amenities` | Same as `/api/hotels/amenities` |
| GET | `/api/stats` | Aggregate counts |

### `GET /api/hotels` query params

| Param | Type | Notes |
|---|---|---|
| `search` | string, ≤200 chars | Free text, FTS5-backed |
| `city`, `country` | string | Exact match |
| `stars` | 1–5 | Exact match |
| `minPrice`, `maxPrice` | number | Filters by each hotel's cheapest room |
| `amenity` | comma-separated ids | Hotel must have **all** listed amenities |
| `sortBy` | `price_asc`\|`price_desc`\|`stars_desc`\|`name_asc` | Defaults to relevance when searching, else name |
| `checkin`, `checkout` | `YYYY-MM-DD` | `checkin` also drives `computed_min_price` |
| `page` | int ≥1 | Default `1` |
| `pageSize` | int ≤50 | Default `20` |

Response shape: `{ data: Hotel[], pagination: { page, pageSize, total, totalPages } }`.

All params are validated by `middleware/validate.js` (Zod schemas in the same
file) — invalid input gets a `400` with a field-level error list, never a raw
500 or a silently-wrong query.

## Testing

```bash
npm test          # runs once
npm run test:watch
```

Tests run against a throwaway SQLite file (`tests/setup.js` sets `DB_PATH` to
a per-process temp file before any app code loads), never the real
`hotel.db`, and are cleaned up automatically after each run.

`app.js` exports the Express app with no `listen()` call, specifically so
Supertest can exercise it directly without binding a real port or leaving an
open handle that would hang the test process. `server.js` is the actual
process entry point (binds the port, owns graceful shutdown).

## Production checklist

- [ ] Set `NODE_ENV=production` and a real `ALLOWED_ORIGINS`
- [ ] Never set `ALLOW_DB_RESET=true` against a database with real data
- [ ] Put this behind a reverse proxy (Nginx/Caddy) or PaaS that terminates
      TLS — the app itself only speaks plain HTTP
- [ ] Ship logs (stdout, structured JSON via Pino) to a log aggregator
- [ ] Point uptime monitoring / load balancer health checks at `/api/health`
- [ ] There is currently no authentication layer or real booking/payment
      flow — the "Book Now" button in the UI is a placeholder. Add auth and
      a bookings table before accepting real reservations.
