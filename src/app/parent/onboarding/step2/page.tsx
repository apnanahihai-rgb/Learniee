"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const fields = [
  "firstName", "lastName", "visibleName", "gender", "age",
  "standard", "board", "currentSchoolName", "learningDifficulties",
];

export default function Step2() {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f, ""]))
  );
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/onboarding/child-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }
    router.push("/parent/onboarding/step3");
  }

  return (
    <form onSubmit={handleNext} className="max-w-md mx-auto mt-10 space-y-3">
      <h1 className="text-xl font-bold text-center">Child Information</h1>
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
      <p className="text-xs text-gray-500">Photo upload will be added later.</p>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-violet-600 text-white p-2 w-full rounded">
        Next
      </button>
    </form>
  );
}