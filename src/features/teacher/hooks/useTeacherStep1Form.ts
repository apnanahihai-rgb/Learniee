"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Step1FormData } from "@/features/teacher/server/step1.service";

const emptyFormData: Step1FormData = {
  firstName: "",
  lastName: "",
  email: "",

  visibleName: "",

  dobDay: "",
  dobMonth: "",
  dobYear: "",

  gender: "",
  nationality: "",

  address: "",
  city: "",
  country: "",
  pincode: "",

  phone: "",
  whatsapp: "",

  aboutMe: "",
  criminalCase: "",
};

/**
 * Encapsulates loading, editing, and submitting the Step 1
 * (personal information) onboarding form.
 */
export function useTeacherStep1Form() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Step1FormData>(emptyFormData);

  useEffect(() => {
    async function loadTeacherData() {
      try {
        setLoading(true);

        const res = await fetch("/api/teacher/onboarding/step1", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load teacher information");
        }

        const data = await res.json();

        setFormData(data.formData);

        if (data.teacherId) {
          localStorage.setItem("teacherId", data.teacherId);
        }
      } catch (error) {
        console.error("Failed to load Step 1:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTeacherData();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch("/api/teacher/onboarding/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        console.error("Failed to save Step 1");
        return;
      }

      const data = await res.json();

      localStorage.setItem("teacherId", data.teacherId);

      router.push("/teacher/onboarding/step2");
    } catch (error) {
      console.error("Step 1 submission error:", error);
    }
  }

  return { loading, formData, handleChange, handleSubmit };
}
