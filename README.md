# Urja Meter API

A small, read-only Node.js API that gives product and data teams structured
access to meter search, meter locations and recent consumption, and
distribution transformer records from the legacy Urja Meter Ops portal.

The service talks to the same portal endpoints used by its logged-in UI. It
does not change portal records, store a local copy of the dataset, or expose
portal credentials to API callers.

## Project layout

- `src/clients` and `src/services/urjaAuth.service.js` manage portal HTTP and
  session login.
- `src/services` normalizes portal payloads and joins meters to transformers.
- `src/controllers` and `src/routes` implement the public API and input checks.
- `src/middleware` provides request IDs, request logging, and JSON errors.
- `tests` cover normalization, paging, validation, and HTTP behavior.
- [PROTOCOL.md](./docs/PROTOCOL.md) records the portal behavior observed during
  exploration; [ARCHITECTURE.md](./docs/ARCHITECTURE.md) describes the service
  boundaries.
- [openapi.json](./openapi.json) is the API contract and is served at
  `/openapi.json`; Swagger UI is available at `/docs`.

## Requirements

- Node.js 18 or newer
- The supplied Urja Meter Ops operator account (or another authorized
  read-only portal account)

## Install and configure

```sh
npm install
```

Copy `.env.example` to `.env` and set the credentials provided for your
environment. Never commit `.env`.

```dotenv
URJA_USERNAME=operator@urja.local
URJA_PASSWORD=your-portal-password
```

The API also accepts `PORT` (default `3000`), `URJA_BASE_URL` (portal URL),
`URJA_REQUEST_TIMEOUT_MS` (default `10000`) and `URJA_CACHE_TTL_MS` (default
`30000`). Credentials are required only when an API request needs portal data;
the local health endpoint is available without them.

## Run and test

```sh
npm start
npm test
```

The server listens on `http://localhost:3000`. It logs request method, path,
status and duration, but never logs portal passwords or session cookies.

## API at a glance

```sh
curl "http://localhost:3000/api/meters?q=J100001&page=1"
curl "http://localhost:3000/api/meters/J100001?limit=48"
curl "http://localhost:3000/api/network/transformers?page=1"
curl "http://localhost:3000/api/network/transformers/DT-002/meters"
curl "http://localhost:3000/api/health"
```

Meter search is paginated using the portal's page size of 20. The detail
endpoint returns normalized GPS coordinates and up to 48 newest half-hour
register readings by default; `limit` accepts 1–336. The portal values are
register readings, not calculated interval deltas. Timestamps remain in the
portal's `DD/MM/YYYY HH:mm` format because it does not declare a timezone.
Collection responses include `data` and `meta`; errors include `error.code`,
`error.message`, and a request ID. See [API_EXAMPLES.md](./docs/API_EXAMPLES.md)
and [openapi.json](./openapi.json) for full details.

## Assumptions, decisions and trade-offs

- Portal account is authorized for read-only use. The adapter makes only GET
  requests to data paths after an ordinary form sign-in.
- Search query `q` follows the portal's search behavior (meter ID and serial
  number); a detail request verifies an exact meter ID, not a substring.
- The portal returns measurements as strings. Numeric fields are converted to
  numbers and malformed data fails explicitly.
- The portal does not expose structured detail data for installation type or
  the complete Zone-to-transformer hierarchy. The API does not scrape its
  rendered HTML or invent values; it returns the source's DT/feeder assignment.
- Transformer membership requires paging through the meter search result,
  since the portal offers no transformer filter. A 30-second in-memory cache
  limits repeated upstream work. It is process-local and is not a freshness
  guarantee.
- The web UI has an export action that signs a bulk request. This first
  version uses ordinary paginated read endpoints instead of implementing the
  separate signing scheme.
- Auth is service-to-portal only. The API itself is intended for a trusted
  local deployment; add caller authentication, TLS termination, rate limits,
  and secret management before exposing it beyond a development network.

## Intentionally skipped

- Writes or operational controls; they are outside the read-only brief.
- Persistent data indexing, spatial search, and a browser front end; the
  source dataset is modest and direct read endpoints meet the core need.
- The complete utility hierarchy and transformation asset graph, because the
  portal does not provide them as structured data.
- A bulk export/signature implementation; API pagination is sufficient for
  this dataset and keeps signing-key handling out of the service.

## Further work

For production, add API consumer authentication and rate limiting, secret
manager integration, structured metrics, retry/backoff for transient portal
failures, and integration tests against a disposable portal fixture. If data
volume grows, load the signed bulk export into a durable index and add
incremental refresh and freshness metadata. The hierarchy can be added if the
utility makes a supported structured source available.

## Reflection

### What assumptions did you make?

I treated the supplied operator account as read-only and treated the portal's
own API responses as the source of truth. I preserved portal timestamps
because no timezone was specified and used a 48-reading default to represent
the most recent day.

### Which part was most difficult, and how did you get unstuck?

The portal is a server-rendered application rather than a documented API.
Inspecting its normal logged-in pages and the requests they make revealed the
search, transformer, geo, and energy paths and their response shapes.

### If you had another day, what would you improve?

I would add controlled integration tests against a portal test account,
measure the bulk export path and its signing rules, and request a supported
structured endpoint for the hierarchy before deciding whether to index it.

### What mistake did you make while solving this?

I initially assumed the human-readable meter detail page would have a
one-to-one JSON detail endpoint. The page's nameplate and hierarchy are
server-rendered, while the browser only requests separate geo and energy JSON.
The adapter therefore limits its contract to verifiable structured data.

### If you were reviewing your own submission, what would you criticise?

The service still depends on a portal login flow and has no caller
authentication. Transformer membership scans all meter pages (bounded by a
short cache), and the source's localized timestamps and missing hierarchy
prevent a richer canonical network model.
