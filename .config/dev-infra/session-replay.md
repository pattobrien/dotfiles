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
- **Table** — `otel.hyperdx_sessions` is auto-created by the exporter
  (`create_schema:true`, same as the `otel_logs`/`otel_traces` sinks) — no hand-maintained
  DDL. The exporter's schema omits HyperDX's `TimestampTime` column, so the viewer's
  session source must use `Timestamp` as its timestamp column (see below).

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

Nothing to seed — `create_schema:true` creates `otel.hyperdx_sessions` at collector
startup, so a fresh dev-infra ClickHouse data dir needs no manual step.
