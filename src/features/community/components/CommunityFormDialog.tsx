"use client";

import { useState } from "react";

import { adminBtn, ADMIN_CONTROL } from "@/features/admin/components/ui/adminStyles";
import { AdminErrorNote, AdminField } from "@/features/admin/components/ui/design";
import PdDialog from "@/features/shared/components/PdDialog";

import type { CommunityFormValues } from "../types/community";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

interface Props {
  heading: string;
  confirmLabel: string;
  initial?: CommunityFormValues;
  onCancel: () => void;
  /** Resolve with an error message to keep the dialog open, or null when saved. */
  onSubmit: (values: CommunityFormValues) => Promise<string | null>;
}

const EMPTY: CommunityFormValues = { title: "", description: "", isPaid: false, price: "" };

/** Create / edit a community: title, description, free or paid (+ price). Mount only while open. */
export default function CommunityFormDialog({ heading, confirmLabel, initial = EMPTY, onCancel, onSubmit }: Props) {
  const [values, setValues] = useState<CommunityFormValues>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const title = values.title.trim();
    const description = values.description.trim();

    if (!title) return setError("Enter a title.");
    if (!description) return setError("Enter a description.");

    if (values.isPaid) {
      const price = Number(values.price);

      if (!Number.isFinite(price) || price <= 0) return setError("Enter a price above 0.");
    }

    setBusy(true);
    setError("");

    const message = await onSubmit({ ...values, title, description });

    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <PdDialog
      title={heading}
      onClose={busy ? () => {} : onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} disabled={busy} className={adminBtn("sec")}>
            Cancel
          </button>
          <button type="button" onClick={() => void submit()} disabled={busy} className={adminBtn("pri")}>
            {busy ? "Saving…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <AdminErrorNote>{error}</AdminErrorNote>

        <AdminField id="community-title" label="Title">
          <input
            id="community-title"
            className={ADMIN_CONTROL}
            value={values.title}
            maxLength={TITLE_MAX}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </AdminField>

        <AdminField id="community-description" label="Description" hint={`${values.description.length}/${DESCRIPTION_MAX}`}>
          <textarea
            id="community-description"
            rows={4}
            className={`${ADMIN_CONTROL} h-auto py-3`}
            value={values.description}
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
          />
        </AdminField>

        <AdminField id="community-access" label="Access">
          <select
            id="community-access"
            className={ADMIN_CONTROL}
            value={values.isPaid ? "paid" : "free"}
            onChange={(e) => setValues({ ...values, isPaid: e.target.value === "paid" })}
          >
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </AdminField>

        {values.isPaid && (
          <AdminField id="community-price" label="Price (₹)">
            <input
              id="community-price"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              className={ADMIN_CONTROL}
              value={values.price}
              onChange={(e) => setValues({ ...values, price: e.target.value })}
            />
          </AdminField>
        )}
      </div>
    </PdDialog>
  );
}
