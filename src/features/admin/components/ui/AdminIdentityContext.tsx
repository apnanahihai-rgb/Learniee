"use client";

import { createContext, useContext } from "react";

export interface AdminIdentity {
  firstName: string;
  lastName: string;
}

/** The signed-in Admin (null until loaded or if the lookup failed). */
export const AdminIdentityContext = createContext<AdminIdentity | null>(null);

export function useAdminIdentity() {
  return useContext(AdminIdentityContext);
}

/** Letter(s) for the round avatar; "A" only while the name is unknown. */
export function adminInitials(identity: AdminIdentity | null) {
  const letters = `${identity?.firstName?.trim()[0] ?? ""}${identity?.lastName?.trim()[0] ?? ""}`;

  return (letters || "A").toUpperCase();
}
