# API examples

Start the API and set portal credentials in `.env` first.

```sh
curl "http://localhost:3000/api/meters?q=J100001&page=1"
curl "http://localhost:3000/api/meters/J100001?limit=48"
curl "http://localhost:3000/api/network/transformers?page=1"
curl "http://localhost:3000/api/network/transformers/DT-002/meters"
curl "http://localhost:3000/api/health"
```

Responses have a `data` property. Paginated collections also have `meta` with
`page`, `pageSize`, `total`, and `totalPages`. Errors have an `error` property
with a stable code, message, and request ID.
