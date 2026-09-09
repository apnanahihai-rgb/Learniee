import "server-only";

import { Prisma, ActivityAction, ActivityActorRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Admin-facing activity log (added Sep 9, 2026). Deliberately NOT a
 * request logger — only a fixed set of major, human-meaningful
 * events (see `ActivityAction` in schema.prisma) get written here.
 * Call sites live next to the business logic they describe, the
 * same convention `notificationTriggers.service.ts` already
 * established for Notifications.
 *
 * `logActivity()` never throws — a logging failure must never break
 * the real action it's attached to (payment, approval, etc.), same
 * reasoning as the notification triggers' `safe()` wrapper. Callers
 * can `await` it directly with no try/catch of their own.
 */

export interface LogActivityInput {
  action: ActivityAction;
  actorRole: ActivityActorRole;
  /**
   * Opaque actor pointer — usually a Cognito `sub`, or the actor's
   * own Prisma id (Teacher.id / ParentProfile.id) when that's what
   * the call site already has on hand. Not FK-constrained (same
   * loosely-typed pattern as `Notification.recipientId`), so it's
   * fine for this to mix identity schemes across actions — it's a
   * secondary filter/audit field, not the primary read path (that's
   * `description`).
   */
  actorId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        action: input.action,
        actorRole: input.actorRole,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        actorEmail: input.actorEmail ?? null,
        description: input.description,
        metadata: input.metadata
          ? (input.metadata as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
  } catch (err) {
    console.error(`Activity log write failed (${input.action}):`, err);
  }
}

/**
 * Best-effort actor identity from a Cognito ID token payload —
 * shared by every route that already has `given_name`/`family_name`/
 * `email` on hand (the client-log route, and any admin route using
 * `requireAdminAuth`/`requireAdminOrAccounts`) so they don't each
 * re-derive display name logic.
 */
export function actorFromTokenPayload(payload: {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
}) {
  const name = [payload.given_name, payload.family_name].filter(Boolean).join(" ").trim();

  return {
    actorId: payload.sub,
    actorName: name || payload.email || null,
    actorEmail: payload.email || null,
  };
}

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export interface ActivityLogFilters {
  action?: ActivityAction;
  actorRole?: ActivityActorRole;
  /** Free-text search across description/actorName/actorEmail. */
  q?: string;
  /** Inclusive lower bound on createdAt. */
  from?: Date;
  /** Inclusive upper bound on createdAt. */
  to?: Date;
}

function buildWhere(filters: ActivityLogFilters): Prisma.ActivityLogWhereInput {
  const where: Prisma.ActivityLogWhereInput = {};

  if (filters.action) where.action = filters.action;
  if (filters.actorRole) where.actorRole = filters.actorRole;

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
      { actorEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  return where;
}

/** Newest-first, paginated — used by the admin Activity Log page. */
export async function listActivityLogs(
  filters: ActivityLogFilters,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const take = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
  const skip = Math.max(page - 1, 0) * take;
  const where = buildWhere(filters);

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { items, total, page, pageSize: take, totalPages: Math.max(1, Math.ceil(total / take)) };
}

const CSV_EXPORT_ROW_CAP = 20_000;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Builds a CSV string for the current filter set — used by the "Download" button. */
export async function buildActivityLogsCsv(filters: ActivityLogFilters): Promise<string> {
  const where = buildWhere(filters);

  const rows = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: CSV_EXPORT_ROW_CAP,
  });

  const header = [
    "Date/Time",
    "Action",
    "Actor Role",
    "Actor Name",
    "Actor Email",
    "Description",
  ];

  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.createdAt.toISOString()),
        csvEscape(row.action),
        csvEscape(row.actorRole),
        csvEscape(row.actorName),
        csvEscape(row.actorEmail),
        csvEscape(row.description),
      ].join(","),
    );
  }

  return lines.join("\n");
}
