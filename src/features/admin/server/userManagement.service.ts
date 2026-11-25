import { UserNotFoundException } from "@aws-sdk/client-cognito-identity-provider";

import { adminDeleteCognitoUser } from "@/lib/cognitoAdmin";
import { prisma } from "@/lib/prisma";
import type { AdminUser } from "@/features/admin/types/user";

/** Error with an HTTP status, so the route can answer 400 / 404 without guessing. */
export class UserManagementError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "UserManagementError";
  }
}

export function isManagedRole(value: unknown): value is AdminUser["role"] {
  return value === "parent" || value === "teacher";
}

/** Every parent and teacher account, sorted by name (Manage users screen). */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const [parents, teachers] = await Promise.all([
    prisma.parentProfile.findMany({ select: { firstName: true, lastName: true, email: true } }),
    prisma.teacher.findMany({ select: { firstName: true, lastName: true, email: true } }),
  ]);

  const users: AdminUser[] = [
    ...parents.map((p) => ({ ...p, role: "parent" as const })),
    ...teachers.map((t) => ({ ...t, role: "teacher" as const })),
  ];

  const nameOf = (u: AdminUser) => `${u.firstName} ${u.lastName}`.trim() || u.email;

  return users.sort((a, b) => nameOf(a).localeCompare(nameOf(b), "en", { sensitivity: "base" }));
}

/** Removes a Cognito login. A login that is already gone counts as success, so a retry never gets stuck. */
async function removeCognitoLogin(username: string) {
  try {
    await adminDeleteCognitoUser(username);
  } catch (error) {
    if (error instanceof UserNotFoundException) return;

    throw error;
  }
}

/**
 * Deletes the account from Cognito and then from the database (students,
 * files and professional info cascade). Cognito goes first: if the database
 * step fails afterwards the person can no longer log in, and Admin can simply
 * run the delete again (a missing Cognito user is ignored).
 */
export async function deleteAdminUser(email: string, role: AdminUser["role"]): Promise<void> {
  if (role === "parent") {
    const parent = await prisma.parentProfile.findUnique({ where: { email } });

    if (!parent) throw new UserManagementError("Parent not found", 404);

    await removeCognitoLogin(parent.cognitoSub);
    await prisma.parentProfile.delete({ where: { email } });

    return;
  }

  const teacher = await prisma.teacher.findUnique({ where: { email } });

  if (!teacher) throw new UserManagementError("Teacher not found", 404);

  await removeCognitoLogin(teacher.cognitoId);
  await prisma.teacher.delete({ where: { email } });
}
