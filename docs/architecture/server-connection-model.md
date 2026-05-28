# Server Connection Model

Executor's North Star is server-centered:

```text
Executor Server
  owns execution, scopes, sources, secrets, policies, MCP, approvals, API

Executor Server Connection
  normalized origin + API URL + display name + auth

Adapters
  CLI       -> resolves a server connection, attaching to the active local owner before daemon start
  Desktop   -> starts sidecar server, publishes it as the active local owner
  Local app -> consumes the local server connection
  Cloud app -> consumes the hosted cloud server connection
```

## Rules

1. Treat the Executor Server as the product core.
2. Treat CLI, desktop, local app, and cloud app as adapters over an Executor Server Connection.
3. Keep daemon lifecycle in the CLI/local adapter. Do not make every server URL mean "daemon".
4. Keep desktop sidecar lifecycle in Electron main/preload. The renderer should receive a connection, not sidecar process details.
5. Keep cloud org, billing, auth, and API keys in the cloud product surface. The reusable app should still talk to the server through the same connection contract.
6. Only one local server process may own a data directory at a time. Other local surfaces must attach to that owner or fail clearly.

## Current Slice

The first slice introduces the shared contract and wires the highest-friction paths:

- `@executor-js/sdk/shared` exports `ExecutorServerConnection` and normalization helpers.
- `@executor-js/react` owns browser connection state and the `ExecutorProvider` connection context.
- Plugin React clients use the active connection's API URL and Authorization header, so plugin routes follow the same server selection and auth path as core routes.
- Desktop preload exposes `getServerConnection()` for the sidecar.
- Cloud setup and app shell construct cloud server connections.
- CLI resolves either a named `--server` profile or an explicit `--base-url` as a server connection. Local HTTP origins may auto-start the daemon; hosted HTTPS origins are explicit remote servers and can use `EXECUTOR_API_KEY` for bearer auth.
- `executor server add/list/use/remove` manages persisted server profiles on top of the shared connection contract.
- The desktop settings plugin displays and refreshes the active `desktop-sidecar` server connection through Electron IPC, while keeping port/auth/password mutation in the desktop adapter.
- The reusable app shell exposes a compact server profile selector backed by the same connection contract. Switching profiles remounts the app atom registry so server-scoped data does not bleed across connections.
- The cloud shell now labels the reusable Executor app workflow separately from hosted Cloud console routes such as organization, billing, and API keys.
- Cloud API-key docs cover hosted CLI profiles and remote HTTP MCP clients using the same hosted server origin.
- CLI daemon/web/MCP sessions and the desktop sidecar publish a local owner manifest under `server-control/server.json` in the active data dir. The manifest carries pid, owner kind, version, data dir, scope dir, connection URL, and auth.
- CLI commands with no explicit server attach to the active local owner before considering daemon auto-start. Explicit/default local URLs that would auto-start a second daemon are blocked when another local owner already holds the data dir.
- Local server startup is serialized with `server-control/startup.lock` so desktop and CLI cannot both bootstrap against the same database at once.

## Follow-On Slices

- Replace remaining legacy `baseUrl` compatibility shims after downstream callers have migrated to `ExecutorServerConnection`.
- Add deeper browser automation around app-side profile switching once the standalone app build no longer requires prebuilt workspace exports.
- Move the local owner manifest to a Unix socket or named-pipe control plane when the server needs richer lifecycle operations than attach/fail/start.
