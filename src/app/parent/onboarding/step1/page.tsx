"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const fields = [
  "visibleName", "tuitionType", "nationality", "nriOrIndian",
  "address", "city", "country", "pincode", "currency",
  "timezone", "whatsappNumber", "relationToStudent",
];

export default function Step1() {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f, ""]))
  );
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/onboarding/parent-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }
    router.push("/parent/onboarding/step2");
  }

  return (
    <form onSubmit={handleNext} className="max-w-md mx-auto mt-10 space-y-3">
      <h1 className="text-xl font-bold text-center">Parent Information</h1>
      {fields.map((key) => (
        <input
          key={key}
          required
          placeholder={key}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="border p-2 w-full"
        />
      ))}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-violet-600 text-white p-2 w-full rounded">
        Next
      </button>
    </form>
  );
}