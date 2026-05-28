# Executor Context

## Product Language

**Executor Server** is the product core. It owns scopes, sources, secrets, policies, tool execution, MCP, approvals, and the typed HTTP API. An Executor Server may run locally, inside the desktop sidecar, or in the hosted cloud runtime.

**Executor Server Connection** is a normalized pointer to an Executor Server. It contains the server origin, API base URL, display name, stable key, server kind, and optional authentication. Product surfaces should depend on this contract instead of each inventing `baseUrl` handling.

**Executor Server Profile** is a named, persisted CLI/app selection for an Executor Server Connection. Profiles choose which server a surface targets; credentials may still come from host-specific auth, such as `EXECUTOR_API_KEY` for the CLI.

**Executor App** is the reusable browser UI for working with an Executor Server. It connects to the active Executor Server Connection, offers app-side profile selection for generic HTTP servers, and avoids knowing whether the selected server came from local, desktop, or cloud.

**Executor CLI** is a command-line adapter over Executor Server Connections. Local server origins may auto-start a daemon; hosted server origins are explicit remote connections and use bearer authentication from the environment.

**Executor Desktop** is a platform adapter that starts a local sidecar Executor Server, manages native settings, and exposes the sidecar as an Executor Server Connection to the app. Desktop settings mutate and restart that sidecar connection inside the Electron adapter.

**Executor Cloud** is the hosted product surface. It includes org, billing, auth, API-key, and hosted execution concerns. The authenticated app still talks to an Executor Server through an Executor Server Connection, while cloud console routes remain visibly separate from reusable app workflows.

**Local Executor Server** is an Executor Server started by the CLI or local dev app on the user's machine.

**Hosted Executor Server** is an Executor Server reached over HTTPS and authenticated with cloud session or API-key credentials.
