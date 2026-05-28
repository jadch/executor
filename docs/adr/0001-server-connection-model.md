# ADR 0001: Server Connection Model

## Status

Accepted

## Context

Executor had three product entry points that all treated "where the server is" differently:

- The CLI defaulted to a local daemon and assumed `--base-url` was part of daemon management.
- The desktop app started a sidecar server, but the renderer mostly inferred that server from `window.location` and Electron header injection.
- The cloud app mixed hosted product concerns with the reusable app surface, using its own API client setup and onboarding MCP URLs.

That made the product relationship shallow: CLI, desktop, app, and cloud each had to know local details about URL construction, auth, and server ownership.

OpenCode's model is cleaner for this product shape: the server is the durable product concept, and CLI/web/desktop are adapters over server connections.

## Decision

Executor will use **Executor Server** as the core product concept and **Executor Server Connection** as the shared contract between product surfaces.

An Executor Server Connection includes:

- `kind`: local HTTP, desktop sidecar, or cloud/hosted server.
- `key`: stable identity for selection and caching.
- `origin`: the web/MCP origin.
- `apiBaseUrl`: the typed API base URL.
- `displayName`: UI label.
- `auth`: optional Basic or Bearer credentials.

The shared contract lives in `@executor-js/sdk/shared`. UI-specific behavior, such as reading an Electron preload bridge, lives in `@executor-js/react`. Product entry points adapt into this contract:

- CLI resolves named `--server` profiles or explicit `--base-url` values into an Executor Server Connection. Local HTTP URLs may auto-start a daemon; hosted URLs are treated as explicit remote servers and can use `EXECUTOR_API_KEY`.
- Desktop exposes its sidecar as an Executor Server Connection through preload IPC; desktop-only settings mutate and restart that connection inside the Electron adapter.
- Cloud identifies its authenticated app connection as a cloud Executor Server Connection, while hosted console routes such as organization, billing, and API keys remain visibly cloud-product concerns.
- The reusable app consumes the active connection through `ExecutorProvider`, and app-side profile selection updates that connection rather than inventing a second URL setting.
- First-party plugin clients must resolve API URL and Authorization from the active Executor Server Connection, not from a standalone `baseUrl` helper.
- Local CLI/desktop servers publish a single active owner manifest in the data directory. Implicit CLI commands attach to that owner; explicit local daemon starts are refused while another owner is alive.

## Consequences

New surfaces should not add one-off `baseUrl` globals or infer server identity directly from the host app. They should either provide or consume an Executor Server Connection.

Local daemon management remains a CLI adapter concern, not the universal meaning of a server URL.

Cloud org/billing/auth remains a hosted product concern, but the app's core tools/sources/secrets/policies workflow talks to an Executor Server through the same connection contract as local and desktop.

Persisted server profiles and selection must stay on top of this contract, not become another URL abstraction.

Client-side caches must be scoped to the active server connection. Switching profiles remounts the app atom registry so scope, source, secret, and policy queries restart against the selected server.

Local data directories are single-owner. This makes version skew explicit: a newer CLI, older daemon, and desktop sidecar can no longer silently write the same SQLite database at the same time when they implement this contract. The next process either attaches to the active owner, waits for startup, or exits with a concrete owner/version/data-dir message.
