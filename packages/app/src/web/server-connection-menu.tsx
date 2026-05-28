import { useCallback, useEffect, useRef, useState } from "react";
import {
  getExecutorServerAuthorizationHeader,
  useExecutorServerConnection,
  useSetExecutorServerConnection,
  type ExecutorServerAuth,
  type ExecutorServerConnection,
  type ExecutorServerConnectionInput,
} from "@executor-js/react/api/server-connection";
import {
  getActiveExecutorServerProfile,
  readExecutorServerProfiles,
  removeExecutorServerProfile,
  selectExecutorServerProfile,
  upsertExecutorServerProfile,
  writeExecutorServerProfiles,
  type ExecutorServerProfilesSnapshot,
} from "@executor-js/react/api/server-profiles";
import { Button } from "@executor-js/react/components/button";
import { Input } from "@executor-js/react/components/input";
import { Label } from "@executor-js/react/components/label";
import { NativeSelect, NativeSelectOption } from "@executor-js/react/components/native-select";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@executor-js/react/components/popover";
import { cn } from "@executor-js/react/lib/utils";

type AuthMode = "none" | "bearer" | "basic";

interface DraftProfile {
  readonly origin: string;
  readonly displayName: string;
  readonly authMode: AuthMode;
  readonly username: string;
  readonly secret: string;
}

const emptyDraft: DraftProfile = {
  origin: "",
  displayName: "",
  authMode: "none",
  username: "executor",
  secret: "",
};

const storage = () => (typeof window === "undefined" ? null : window.localStorage);

const serverLabel = (connection: ExecutorServerConnection): string =>
  connection.displayName || connection.origin.replace(/^https?:\/\//, "");

const serverDescription = (connection: ExecutorServerConnection): string =>
  connection.origin.replace(/^https?:\/\//, "");

const serverKindLabel = (connection: ExecutorServerConnection): string => {
  if (connection.kind === "desktop-sidecar") return "Desktop";
  const hostname = new URL(connection.origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
    ? "Local"
    : "Remote";
};

const authLabel = (connection: ExecutorServerConnection): string => {
  const authorization = getExecutorServerAuthorizationHeader(connection);
  if (!authorization) return "No auth";
  if (authorization.startsWith("Bearer ")) return "Bearer";
  if (authorization.startsWith("Basic ")) return "Basic";
  return "Auth";
};

const snapshotWithCurrent = (
  snapshot: ExecutorServerProfilesSnapshot,
  connection: ExecutorServerConnection,
  makeActive: boolean,
): ExecutorServerProfilesSnapshot =>
  upsertExecutorServerProfile(snapshot, connection, { makeActive }) ?? snapshot;

const draftAuth = (draft: DraftProfile): ExecutorServerAuth | undefined => {
  const secret = draft.secret.trim();
  if (draft.authMode === "bearer" && secret) {
    return { kind: "bearer", token: secret };
  }
  if (draft.authMode === "basic" && secret) {
    return {
      kind: "basic",
      username: draft.username.trim() || undefined,
      password: secret,
    };
  }
  return undefined;
};

export function ServerConnectionMenu() {
  const connection = useExecutorServerConnection();
  const setServerConnection = useSetExecutorServerConnection();
  const hydratedRef = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [snapshot, setSnapshot] = useState<ExecutorServerProfilesSnapshot>(() => ({
    activeKey: connection.key,
    profiles: [connection],
  }));
  const [draft, setDraft] = useState<DraftProfile>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [showCustomServer, setShowCustomServer] = useState(false);

  const persistSnapshot = useCallback((next: ExecutorServerProfilesSnapshot) => {
    setSnapshot(next);
    writeExecutorServerProfiles(storage(), next);
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const stored = readExecutorServerProfiles(storage());
    const storedActive = getActiveExecutorServerProfile(stored);
    const next = snapshotWithCurrent(stored, connection, storedActive === null);
    persistSnapshot(next);
    if (storedActive && storedActive.key !== connection.key) {
      setServerConnection(storedActive);
    }
    setHydrated(true);
  }, [connection, persistSnapshot, setServerConnection]);

  useEffect(() => {
    if (!hydrated) return;
    setSnapshot((previous) => {
      const next = snapshotWithCurrent(previous, connection, true);
      writeExecutorServerProfiles(storage(), next);
      return next;
    });
  }, [connection, hydrated]);

  const selectProfile = (key: string): void => {
    const next = selectExecutorServerProfile(snapshot, key);
    const active = getActiveExecutorServerProfile(next);
    persistSnapshot(next);
    if (active) setServerConnection(active);
  };

  const removeProfile = (key: string): void => {
    if (snapshot.profiles.length <= 1) return;
    const next = removeExecutorServerProfile(snapshot, key);
    const active = getActiveExecutorServerProfile(next);
    persistSnapshot(next);
    if (key === connection.key && active) setServerConnection(active);
  };

  const addProfile = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const origin = draft.origin.trim();
    if (!origin) {
      setError("Enter a server origin.");
      return;
    }
    if (draft.authMode !== "none" && !draft.secret.trim()) {
      setError("Enter the credential value.");
      return;
    }

    const auth = draftAuth(draft);
    const input: ExecutorServerConnectionInput = {
      kind: "http",
      origin,
      ...(draft.displayName.trim() ? { displayName: draft.displayName.trim() } : {}),
      ...(auth ? { auth } : {}),
    };
    const next = upsertExecutorServerProfile(snapshot, input);
    const active = next ? getActiveExecutorServerProfile(next) : null;
    if (!next || !active) {
      setError("Enter a valid http or https origin.");
      return;
    }

    setError(null);
    setDraft(emptyDraft);
    setShowCustomServer(false);
    persistSnapshot(next);
    setServerConnection(active);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto w-full justify-start rounded-md px-2.5 py-2 text-left hover:bg-sidebar-active"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Server</span>
            <span className="truncate text-sm font-medium text-foreground">
              {serverLabel(connection)}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {serverDescription(connection)}
            </span>
          </span>
          <span className="rounded border border-border/70 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            {authLabel(connection)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-0">
        <PopoverHeader className="border-b border-border px-4 py-3">
          <PopoverTitle>Server profiles</PopoverTitle>
        </PopoverHeader>

        <div className="max-h-56 overflow-y-auto p-2">
          {snapshot.profiles.map((profile) => {
            const active = profile.key === connection.key;
            return (
              <div
                key={profile.key}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5",
                  active ? "bg-accent/70" : "hover:bg-accent/40",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => selectProfile(profile.key)}
                  className="h-auto min-w-0 flex-1 justify-start px-0 py-0 text-left hover:bg-transparent"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {serverLabel(profile)}
                    </span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {serverDescription(profile)}
                    </span>
                  </span>
                </Button>
                <span className="rounded border border-border/70 px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {serverKindLabel(profile)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  disabled={snapshot.profiles.length <= 1}
                  onClick={() => removeProfile(profile.key)}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border p-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2"
            onClick={() => {
              setError(null);
              setShowCustomServer((value) => !value);
            }}
          >
            {showCustomServer ? "Hide custom server" : "Custom server"}
          </Button>

          {showCustomServer && (
            <form onSubmit={addProfile} className="mt-3">
              <div className="grid gap-2">
                <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Origin
                  <Input
                    value={draft.origin}
                    onChange={(event) => setDraft({ ...draft, origin: event.target.value })}
                    placeholder="https://executor.example"
                    className="h-8 text-sm"
                  />
                </Label>
                <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Name
                  <Input
                    value={draft.displayName}
                    onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
                    placeholder="Remote executor"
                    className="h-8 text-sm"
                  />
                </Label>
                <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Auth
                  <NativeSelect
                    size="sm"
                    value={draft.authMode}
                    onChange={(event) =>
                      setDraft({ ...draft, authMode: event.target.value as AuthMode })
                    }
                  >
                    <NativeSelectOption value="none">None</NativeSelectOption>
                    <NativeSelectOption value="bearer">Bearer token</NativeSelectOption>
                    <NativeSelectOption value="basic">Basic password</NativeSelectOption>
                  </NativeSelect>
                </Label>
                {draft.authMode === "basic" && (
                  <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Username
                    <Input
                      value={draft.username}
                      onChange={(event) => setDraft({ ...draft, username: event.target.value })}
                      className="h-8 text-sm"
                    />
                  </Label>
                )}
                {draft.authMode !== "none" && (
                  <Label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    {draft.authMode === "bearer" ? "Token" : "Password"}
                    <Input
                      type="password"
                      value={draft.secret}
                      onChange={(event) => setDraft({ ...draft, secret: event.target.value })}
                      className="h-8 text-sm"
                    />
                  </Label>
                )}
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" size="sm" className="w-full">
                  Add and use
                </Button>
              </div>
            </form>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
