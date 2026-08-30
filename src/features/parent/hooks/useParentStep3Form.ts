"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { emptyStep3FormData, type Step3FormData } from "@/features/parent/types/onboarding";

export function useParentStep3Form() {
  const router = useRouter();

  const [formData, setFormData] = useState<Step3FormData>(emptyStep3FormData);
  const [suggestions, setSuggestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/onboarding/additional-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, suggestions }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
      }

      router.push("/parent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return { formData, suggestions, setSuggestions, submitting, error, handleChange, handleSubmit };
}
