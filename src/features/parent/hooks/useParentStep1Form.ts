"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidPhoneNumber } from "react-phone-number-input";
import { emptyStep1FormData, type Step1FormData } from "@/features/parent/types/onboarding";

type Step1FormErrors = Partial<Record<keyof Step1FormData, string>>;
type AutofilledFields = Partial<Record<keyof Step1FormData, boolean>>;

interface PrefillResponse {
  visibleName?: string;
  whatsappNumber?: string;
}

// Regional defaults for an India-first platform. Only applied for "Indian"
// parents; an NRI's country/timezone are left blank and can be filled in
// later from the profile page.
const DEFAULT_COUNTRY = "India";
const DEFAULT_CURRENCY = "INR - Indian Rupee";
const DEFAULT_TIMEZONE = "Asia/Kolkata (IST)";

async function fetchPrefill(): Promise<PrefillResponse | null> {
  try {
    const res = await fetch("/api/onboarding/prefill");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function postStep1(formData: Step1FormData) {
  const isIndian = formData.nriOrIndian === "Indian";

  const body = {
    visibleName: formData.visibleName.trim(),
    nriOrIndian: formData.nriOrIndian,
    city: formData.city.trim(),
    whatsappNumber: formData.whatsappNumber.trim(),
    referredByCode: formData.referredByCode.trim(),
    currency: DEFAULT_CURRENCY,
    ...(isIndian ? { country: DEFAULT_COUNTRY, timezone: DEFAULT_TIMEZONE } : {}),
  };

  const res = await fetch("/api/onboarding/parent-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Something went wrong. Please try again.");
  }
}

/** Every field shown with a required "*" in step1/page.tsx — keep the two in sync. `referredByCode` is optional. */
function validateStep1(formData: Step1FormData): Step1FormErrors {
  const errors: Step1FormErrors = {};

  if (!formData.visibleName.trim()) errors.visibleName = "Display name is required";
  if (!formData.nriOrIndian) errors.nriOrIndian = "Please select one";
  if (!formData.city.trim()) errors.city = "City is required";

  if (!formData.whatsappNumber.trim()) {
    errors.whatsappNumber = "WhatsApp number is required";
  } else if (!isValidPhoneNumber(formData.whatsappNumber)) {
    errors.whatsappNumber = "Enter a valid phone number";
  }

  return errors;
}

export function useParentStep1Form() {
  const router = useRouter();

  const [formData, setFormData] = useState<Step1FormData>(emptyStep1FormData);
  const [errors, setErrors] = useState<Step1FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [autofilled, setAutofilled] = useState<AutofilledFields>({});

  // Pre-fill what we already know from signup (name, phone). Never
  // overwrites anything the user has already typed.
  useEffect(() => {
    let cancelled = false;

    fetchPrefill().then((data) => {
      if (cancelled || !data) return;

      setFormData((prev) => {
        const next = { ...prev };
        const filled: AutofilledFields = {};

        if (!prev.visibleName && data.visibleName) {
          next.visibleName = data.visibleName;
          filled.visibleName = true;
        }
        if (!prev.whatsappNumber && data.whatsappNumber) {
          next.whatsappNumber = data.whatsappNumber;
          filled.whatsappNumber = true;
        }

        if (Object.keys(filled).length > 0) {
          setAutofilled((prevAutofilled) => ({ ...prevAutofilled, ...filled }));
        }

        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name as keyof Step1FormData] ? { ...prev, [name]: undefined } : prev));
    setAutofilled((prev) =>
      prev[name as keyof Step1FormData] ? { ...prev, [name]: false } : prev,
    );
  }

  function handleWhatsappChange(value: string) {
    setFormData((prev) => ({ ...prev, whatsappNumber: value }));
    setErrors((prev) => (prev.whatsappNumber ? { ...prev, whatsappNumber: undefined } : prev));
    setAutofilled((prev) => (prev.whatsappNumber ? { ...prev, whatsappNumber: false } : prev));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validationErrors = validateStep1(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setError("Please fill in all required fields before continuing.");
      return;
    }

    setSubmitting(true);

    try {
      await postStep1(formData);
      router.push("/parent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return {
    formData,
    errors,
    submitting,
    error,
    autofilled,
    handleChange,
    handleWhatsappChange,
    handleSubmit,
  };
}
