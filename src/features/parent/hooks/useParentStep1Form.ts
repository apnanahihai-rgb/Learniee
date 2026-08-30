"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emptyStep1FormData, type Step1FormData } from "@/features/parent/types/onboarding";

async function postStep1(body: Step1FormData) {
  const res = await fetch("/api/onboarding/parent-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Something went wrong. Please try again.");
  }
}

export function useParentStep1Form() {
  const router = useRouter();

  const [formData, setFormData] = useState<Step1FormData>(emptyStep1FormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleWhatsappChange(value: string) {
    setFormData((prev) => ({ ...prev, whatsappNumber: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await postStep1(formData);
      router.push("/parent/onboarding/step2");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return { formData, submitting, error, handleChange, handleWhatsappChange, handleSubmit };
}
