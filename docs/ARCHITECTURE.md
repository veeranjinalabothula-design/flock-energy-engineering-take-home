# Architecture

```text
HTTP caller
  -> Express routes/controllers (validation and stable response envelope)
  -> meter/network services (normalization, pagination and joins)
  -> Urja portal service (response shape checks and short TTL cache)
  -> Urja client + auth service (session form login, timeout, one auth retry)
  -> read-only Urja Meter Ops endpoints
```

The API is deliberately a small stateless adapter. Credentials are read from
the process environment; portal cookies and cached responses remain in memory.
The error middleware maps invalid API input, missing records, and upstream
failures to explicit JSON errors. There is no database, background job, or
write operation.

Transformer membership is not directly filterable in the portal search API.
The membership endpoint therefore walks the 20-record pages and filters by
`dtCode`; short-lived response caching avoids repeating that work for every
request. The whole network hierarchy is not reconstructed because the portal
does not expose it as structured JSON.
