# Session replay (rrweb over OpenTelemetry)

Debugging-focused session replay, reusing the existing `otel-collector → ClickHouse`
pipeline and the HyperDX app as the viewer. No bespoke ingest service.

```
browser app (@hyperdx/browser, wraps @rrweb/record)
      │  OTLP/HTTP logs (each rrweb event tagged rr-web.event)
      ▼
otel-collector  ──routing/logs──▶ rr-web.event?  ── yes ─▶ clickhouse/rrweb ─▶ otel.hyperdx_sessions
                                                  └─ no ──▶ clickhouse        ─▶ otel.otel_logs
                                                                                      │
                                                              HyperDX app (viewer) ◀──┘  reads hyperdx_sessions
```

## Pieces (all in this repo)

- **Routing + sink** — `otel-collector.yaml`: a `routing/logs` connector splits logs
  carrying an `rr-web.event` attribute into a `clickhouse/rrweb` exporter that writes
  the `otel.hyperdx_sessions` table.
- **Table** — `clickhouse/hyperdx_sessions.sql`: pre-created (the exporter runs
  `create_schema:false`), DDL lifted verbatim from HyperDX so the viewer reads it.

## Browser SDK (in your app)

```ts
import HyperDX from '@hyperdx/browser';

HyperDX.init({
  url: 'http://localhost:4318',      // the dev-infra otel-collector (OTLP/HTTP)
  apiKey: '',                        // unused — the local collector is unauthenticated
  service: 'my-frontend-app',
  consoleCapture: true,              // console logs/errors alongside the replay
  advancedNetworkCapture: true,      // request/response metadata
  tracePropagationTargets: [/localhost:\d+\/api/i], // correlate replay ↔ backend traces
});
```

`@hyperdx/browser` records rrweb and ships events as OTLP logs tagged `rr-web.event`
(session key `rum.sessionId` in resource attributes). Configure rrweb privacy masking
via its options; nothing is masked by default beyond the SDK's defaults.

## Viewer (one-time HyperDX UI step — not automatable from config)

HyperDX stores sources/connections in Mongo, so this is done in the app UI (`:8082`):

1. **Team Settings → Connections** — ensure a ClickHouse connection exists:
   host `clickhouse:8123`, user `clickhouse`, password from `op://Infra/dev-infra-clickhouse`.
2. **Team Settings → Sources → Add Source → Session**:
   - Database `otel`, Table `hyperdx_sessions`
   - Timestamp column `Timestamp`
   - Body/event expression `Body`, event attributes `LogAttributes`
   - Correlate to your logs/traces source via the session id (`rum.sessionId` /
     `ResourceAttributes`).
3. Replays then appear under **Sessions** in HyperDX.

## Reproducibility note

`hyperdx_sessions.sql` is applied manually, not yet wired as a ClickHouse init script,
so a **fresh** dev-infra ClickHouse data dir won't have the table and the rrweb exporter
will log `schema detection failed` until it's applied:

```sh
CH_PW=$(grep '^CLICKHOUSE_PASSWORD=' ~/.config/dev-infra/.env | cut -d= -f2-)
docker exec -i dev-infra-clickhouse-1 clickhouse-client --user clickhouse \
  --password "$CH_PW" --multiquery < ~/.config/dev-infra/clickhouse/hyperdx_sessions.sql
```
