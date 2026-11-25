"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { ADMIN_CARD, ADMIN_CONTROL, adminBtn, adminTag } from "@/features/admin/components/ui/adminStyles";
import {
  AdminErrorNote,
  AdminField,
  AdminHead,
  AdminLoadingState,
  AdminStack,
  AdminToast,
} from "@/features/admin/components/ui/design";
import { useProfile, type AdminProfileFormFields } from "@/features/admin/hooks/useProfile";
import { getInitials } from "@/lib/initials";

/**
 * Admin My profile (design 25). Data: `GET` / `PATCH /api/admin/profile`
 * (verified Admin auth). Name and phone are editable; email comes from the
 * login and is read-only. Phone is optional (blank clears it).
 */

const EMPTY_FORM: AdminProfileFormFields = { firstName: "", lastName: "", phone: "" };

export default function AdminProfilePage() {
  const { profile, loading, saving, error, save } = useProfile();

  const [form, setForm] = useState<AdminProfileFormFields>(EMPTY_FORM);
  const [toast, setToast] = useState("");
  const [invalid, setInvalid] = useState<"" | "firstName" | "lastName">("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? "",
    });
  }, [profile]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }

  function setField(name: keyof AdminProfileFormFields, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (invalid === name) setInvalid("");
  }

  function handleCancel() {
    if (!profile) return;
    setInvalid("");
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? "",
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.firstName.trim()) {
      setInvalid("firstName");
      document.getElementById("p1")?.focus();
      return;
    }
    if (!form.lastName.trim()) {
      setInvalid("lastName");
      document.getElementById("p2")?.focus();
      return;
    }

    const ok = await save({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
    });

    if (ok) showToast("Profile saved");
  }

  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : "";
  const email = profile?.email ?? "";

  return (
    <AdminStack>
      <AdminHead
        crumbs={[{ label: "Overview", href: "/admin" }]}
        title="My profile"
        description={email}
      />

      <AdminErrorNote>{error}</AdminErrorNote>

      {loading && !profile ? (
        <AdminLoadingState message="Loading your profile…" />
      ) : profile ? (
        <div className="grid max-w-[1000px] items-start gap-5 min-[1024px]:grid-cols-[280px_minmax(0,1fr)]">
          <aside
            className={`${ADMIN_CARD} flex flex-col items-center gap-1.5 px-5 py-7 text-center`}
          >
            <span
              aria-hidden="true"
              className="grid size-[88px] place-items-center rounded-full bg-pd-brand font-heading text-[38px] font-semibold text-white"
            >
              {getInitials(fullName, "A")}
            </span>
            <h2 className="font-heading text-[19px] font-semibold">{fullName}</h2>
            <p className="text-[13px] text-pd-ink3">{email}</p>
            <span className={adminTag("violet")}>Admin</span>
          </aside>

          <form
            onSubmit={handleSubmit}
            noValidate
            className={`${ADMIN_CARD} flex flex-col gap-4 p-5`}
          >
            <div className="grid gap-4 min-[640px]:grid-cols-2">
              <AdminField id="p1" label="First Name">
                <input
                  id="p1"
                  type="text"
                  value={form.firstName}
                  onChange={(event) => setField("firstName", event.target.value)}
                  aria-invalid={invalid === "firstName" || undefined}
                  autoComplete="given-name"
                  className={`${ADMIN_CONTROL} aria-[invalid=true]:border-pd-red`}
                />
              </AdminField>

              <AdminField id="p2" label="Last Name">
                <input
                  id="p2"
                  type="text"
                  value={form.lastName}
                  onChange={(event) => setField("lastName", event.target.value)}
                  aria-invalid={invalid === "lastName" || undefined}
                  autoComplete="family-name"
                  className={`${ADMIN_CONTROL} aria-[invalid=true]:border-pd-red`}
                />
              </AdminField>

              <AdminField
                id="p3"
                label="Email"
                hint="Email is managed through your login and cannot be changed here."
              >
                <input
                  id="p3"
                  type="email"
                  value={email}
                  disabled
                  className={ADMIN_CONTROL}
                />
              </AdminField>

              <AdminField id="p4" label="Phone">
                <input
                  id="p4"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  autoComplete="tel"
                  className={ADMIN_CONTROL}
                />
              </AdminField>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-pd-line pt-4">
              <button type="submit" disabled={saving} className={adminBtn("pri")}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" onClick={handleCancel} disabled={saving} className={adminBtn("out")}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <AdminToast message={toast} />
    </AdminStack>
  );
}
