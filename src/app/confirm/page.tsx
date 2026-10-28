"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ConfirmForm() {
  const email = useSearchParams().get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not confirm your email. Please try again.");
        return;
      }

      router.push("/login");
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
  }

  return (
    <form onSubmit={handleConfirm} className="max-w-sm mx-auto mt-10 space-y-3">
      <h1 className="text-xl font-bold">Confirm your email</h1>
      <p className="text-sm text-gray-600">Enter the code sent to {email}</p>
      <input
        required
        placeholder="Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="border p-2 w-full"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-violet-600 text-white p-2 w-full rounded">
        Confirm
      </button>
    </form>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="text-center mt-10">Loading...</div>}>
      <ConfirmForm />
    </Suspense>
  );
}