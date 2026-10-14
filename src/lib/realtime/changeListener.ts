import "server-only";

import { readFileSync } from "fs";
import path from "path";
import { Client } from "pg";

/**
 * One shared Postgres `LISTEN` connection per server process, fanned out
 * to every open `/api/realtime` stream in that process.
 *
 * The database triggers added in
 * `prisma/migrations/20261014090000_add_realtime_change_notify` call
 * `pg_notify('learniee_changes', …)` after each committed write; this
 * module turns those notifications into `ChangeEvent`s.
 *
 * Notes:
 *  - `LISTEN` needs a direct (session) connection. A transaction-mode
 *    pooler such as RDS Proxy / pgbouncer in transaction mode will not
 *    deliver notifications — point `DATABASE_URL` at the instance itself.
 *  - The connection is opened lazily on the first subscriber and closed
 *    when the last one leaves, so an idle instance holds no extra
 *    connection (matters on Vercel, where `max` is 1 per instance).
 */

const CHANNEL = "learniee_changes";
const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 30_000;

export interface ChangeEvent {
  /** Postgres table name, or "*" meaning "assume everything changed". */
  table: string;
  parentId?: string;
  teacherId?: string;
  recipientId?: string;
}

type Listener = (event: ChangeEvent) => void;

interface ListenerState {
  listeners: Set<Listener>;
  client: Client | null;
  connecting: boolean;
  everConnected: boolean;
  retryMs: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
}

const globalState = globalThis as unknown as { __learnieeChangeListener?: ListenerState };

const state: ListenerState = (globalState.__learnieeChangeListener ??= {
  listeners: new Set(),
  client: null,
  connecting: false,
  everConnected: false,
  retryMs: RETRY_MIN_MS,
  retryTimer: null,
});

// Same TLS setup as src/lib/prisma.ts (SSL on by default for RDS).
function buildSsl() {
  if (process.env.DATABASE_SSL === "false") {
    return undefined;
  }

  return {
    ca: readFileSync(path.join(process.cwd(), "certs/rds-global-bundle.pem")).toString(),
    rejectUnauthorized: true,
  };
}

function emit(event: ChangeEvent) {
  for (const listener of state.listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("Realtime listener failed:", error);
    }
  }
}

function parseNotification(payload: string | undefined): ChangeEvent | null {
  if (!payload) {
    return null;
  }

  try {
    const raw = JSON.parse(payload) as { t?: string; p?: string; e?: string; r?: string };

    if (!raw.t) {
      return null;
    }

    return { table: raw.t, parentId: raw.p, teacherId: raw.e, recipientId: raw.r };
  } catch {
    return null;
  }
}

function clearRetry() {
  if (state.retryTimer) {
    clearTimeout(state.retryTimer);
    state.retryTimer = null;
  }
}

function dropClient() {
  const client = state.client;

  state.client = null;
  state.connecting = false;

  if (client) {
    client.removeAllListeners();
    // Swallow errors raised while tearing down a broken connection.
    client.on("error", () => {});
    void client.end().catch(() => {});
  }
}

function scheduleReconnect() {
  if (state.retryTimer || state.listeners.size === 0) {
    return;
  }

  state.retryTimer = setTimeout(() => {
    state.retryTimer = null;
    void connect();
  }, state.retryMs);

  state.retryMs = Math.min(state.retryMs * 2, RETRY_MAX_MS);
}

async function connect() {
  if (state.client || state.connecting || state.listeners.size === 0) {
    return;
  }

  state.connecting = true;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: buildSsl(),
    keepAlive: true,
  });

  state.client = client;

  const onLost = (error?: Error) => {
    if (state.client !== client) {
      return;
    }

    if (error) {
      console.error("Realtime LISTEN connection lost:", error.message);
    }

    dropClient();
    scheduleReconnect();
  };

  client.on("error", onLost);
  client.on("end", () => onLost());
  client.on("notification", (message) => {
    const event = parseNotification(message.payload);

    if (event) {
      emit(event);
    }
  });

  try {
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);

    if (state.client !== client) {
      return; // torn down while connecting
    }

    state.connecting = false;
    state.retryMs = RETRY_MIN_MS;

    // Writes that happened while we were disconnected were never seen,
    // so tell every open stream to refresh everything once.
    if (state.everConnected) {
      emit({ table: "*" });
    }

    state.everConnected = true;
  } catch (error) {
    onLost(error instanceof Error ? error : new Error(String(error)));
  }
}

/** Subscribes to committed database changes. Returns an unsubscribe function. */
export function subscribeToChanges(listener: Listener): () => void {
  state.listeners.add(listener);
  clearRetry();
  void connect();

  return () => {
    state.listeners.delete(listener);

    if (state.listeners.size === 0) {
      clearRetry();
      state.retryMs = RETRY_MIN_MS;
      state.everConnected = false;
      dropClient();
    }
  };
}
