# Urja Meter Ops protocol notes

## Observed access

The portal is a server-rendered SvelteKit web application at
`https://urja-ops.flockenergy.tech`. The sign-in page is `/login`. It submits
`email` and `password` as a URL-encoded `POST` to `/login`; a successful sign-in
establishes a browser session cookie. The adapter performs that same form
submission and keeps the cookie in memory. It does not persist credentials or
session cookies to disk.

All integration requests are read-only `GET`s after login:

| Portal path | Observed purpose and response |
| --- | --- |
| `/portal/meters/search?q={query}&page={page}` | Search by meter ID or serial; JSON includes `data`, `total`, `page`, and `pageSize` (20 observed). Each result includes `meterId`, `serialNo`, `make`, `phaseType`, `installStatus`, and `dtCode`. |
| `/portal/meters/{meterId}/geo` | JSON `data` with `latitude` and `longitude`; coordinates arrive as strings. |
| `/portal/meters/{meterId}/energy` | JSON `data` array containing `timestamp`, `kwh`, `kvah`, and `voltR`; values arrive as strings and timestamps use `DD/MM/YYYY HH:mm`. Readings are half-hourly and were returned oldest-first (337 rows observed for a sample meter). |
| `/portal/dts?page={page}` | Paginated transformer records with `code`, `name`, `feederCode`, and `capacityKva`; 20 records per page observed. |
| `/meters/{meterId}` | Human-readable server-rendered meter page. It displays installation type and a zone-to-transformer hierarchy, but no corresponding JSON detail endpoint was exposed by the UI's browser requests. |

The transformer page's “Export all meters” action uses `/portal/keys` to obtain
a signing secret and then signs a request to `/portal/export`. The API does not
use that bulk export flow: ordinary search pagination provides the data needed
for the requested endpoints and avoids handling a separate signing mechanism.
The secret is never requested by this adapter.

## Quirks and constraints

- The portal returns only 20 search/transformer records per page. Meter list
  pages use the portal's page size; the API retains that pagination.
- Meter search is a text query over meter ID or serial, not a generic field
  filter. The adapter checks an exact ID match for meter detail requests.
- Coordinates and consumption values are string-encoded in portal JSON. The
  API converts them to numbers and reports malformed upstream data as an error.
- Portal timestamps are retained verbatim rather than reinterpreted as UTC:
  the portal provides no timezone or ISO timestamp. The kWh/kVAh fields are
  portal register readings (the sample values increase over time), not
  calculated half-hour interval deltas.
- The detail web page contains more hierarchy and installation type data than
  the read-only JSON endpoints. The API does not scrape presentation HTML, so
  those unavailable fields are not fabricated.
- Session authentication and APIs were observed using the assignment's
  operator account. The adapter relies on the same credentials supplied
  through environment variables and retries one request after an expired
  session.
- Successful GET responses are cached in-process for 30 seconds by default.
  This bounds repeated full-list lookups without implying real-time freshness.

## Verification performed

The authenticated portal UI showed 403 meters and 20 transformers across two
pages. A detail page showed its transformer assignment, GPS coordinates, and
half-hour consumption history. API response shapes and field names above were
checked against the portal in October 2026.
