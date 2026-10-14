import { requireCognitoAuth, type CognitoTokenPayload } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { subscribeToChanges, type ChangeEvent } from "@/lib/realtime/changeListener";
import { RESOURCE_MAP, type ResourceRule } from "@/lib/realtime/resourceMap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Batch bursts of changes (a write usually touches several tables). */
const FLUSH_MS = 150;
/** Keeps proxies from closing an idle stream; the client uses it as a heartbeat. */
const PING_MS = 15_000;
/**
 * Streams are recycled before the platform's function time limit; the
 * browser reconnects on its own within a second. Override with
 * REALTIME_MAX_STREAM_MS (e.g. a larger value on the Docker deployment).
 */
const MAX_STREAM_MS = Number(process.env.REALTIME_MAX_STREAM_MS) || 270_000;

const encoder = new TextEncoder();

interface Viewer {
  role: string | undefined;
  /** ParentProfile.id for parents, Teacher.id for teachers, otherwise null. */
  ownerId: string | null;
}

async function resolveViewer(role: string | undefined, sub: string): Promise<Viewer> {
  if (role === "parent") {
    const parent = await prisma.parentProfile.findUnique({
      where: { cognitoSub: sub },
      select: { id: true },
    });

    return { role, ownerId: parent?.id ?? null };
  }

  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: { cognitoId: sub },
      select: { id: true },
    });

    return { role, ownerId: teacher?.id ?? null };
  }

  return { role, ownerId: null };
}

/**
 * Staff roles hear about every change. Parents and teachers hear about
 * shared data, rows without an owner, and rows that are theirs.
 */
function isVisibleTo(viewer: Viewer, event: ChangeEvent, rule: ResourceRule): boolean {
  if (rule.scope === "all") {
    return true;
  }

  if (viewer.role !== "parent" && viewer.role !== "teacher") {
    return true;
  }

  const ownerColumn = viewer.role === "parent" ? event.parentId : event.teacherId;
  const hasOwner = Boolean(event.parentId || event.teacherId || event.recipientId);

  if (!hasOwner) {
    return true;
  }

  if (!viewer.ownerId) {
    return false;
  }

  return ownerColumn === viewer.ownerId || event.recipientId === viewer.ownerId;
}

/**
 * GET — Server-Sent Events stream of "this data changed" signals.
 *
 * It sends no row data, only API path prefixes (e.g. `/api/parent/wallet`).
 * The browser (src/lib/realtimeClient.ts) turns them into the same
 * `learniee:data-changed` event `useAutoRefresh` already listens to, so
 * only the components that show that data refetch it, through the
 * normal authenticated API routes.
 */
export async function GET(req: Request) {
  const auth = requireCognitoAuth<CognitoTokenPayload & { exp?: number }>(req);

  if ("error" in auth) {
    return auth.error;
  }

  const expiresInMs = (auth.payload.exp ?? 0) * 1000 - Date.now();
  const lifetimeMs = Math.min(MAX_STREAM_MS, expiresInMs);

  let viewer: Viewer;

  try {
    viewer = await resolveViewer(auth.payload["custom:role"], auth.payload.sub);
  } catch (error) {
    console.error("Realtime viewer lookup error:", error);
    return new Response("Failed to open the live-update stream.", { status: 500 });
  }

  let shutdown: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let flushTimer: ReturnType<typeof setTimeout> | null = null;
      const pending = new Set<string>();

      const send = (chunk: string) => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          shutdown();
        }
      };

      const flush = () => {
        flushTimer = null;

        if (pending.size === 0) {
          return;
        }

        const prefixes = [...pending];

        pending.clear();
        send(`event: change\ndata: ${JSON.stringify({ prefixes })}\n\n`);
      };

      const unsubscribe = subscribeToChanges((event) => {
        if (event.table === "*") {
          pending.add("/api");
        } else {
          const rule = RESOURCE_MAP[event.table];

          if (!rule || !isVisibleTo(viewer, event, rule)) {
            return;
          }

          rule.paths.forEach((path) => pending.add(path));
        }

        flushTimer ??= setTimeout(flush, FLUSH_MS);
      });

      const pingTimer = setInterval(() => send("event: ping\ndata: {}\n\n"), PING_MS);
      const lifetimeTimer = setTimeout(() => shutdown(), Math.max(lifetimeMs, 0));

      shutdown = () => {
        if (closed) {
          return;
        }

        closed = true;
        clearInterval(pingTimer);
        clearTimeout(lifetimeTimer);

        if (flushTimer) {
          clearTimeout(flushTimer);
        }

        unsubscribe();

        try {
          controller.close();
        } catch {
          // already closed by the client
        }
      };

      req.signal.addEventListener("abort", () => shutdown());

      send("retry: 1000\n\nevent: ready\ndata: {}\n\n");
    },
    cancel() {
      shutdown();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
