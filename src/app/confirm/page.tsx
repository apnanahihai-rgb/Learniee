"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CognitoUser } from "amazon-cognito-identity-js";
import { userPool } from "@/lib/cognito";

export default function ConfirmPage() {
  const email = useSearchParams().get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const user = new CognitoUser({ Username: email, Pool: userPool });
    user.confirmRegistration(code, true, (err) => {
      if (err) {
        setError(err.message);
        return;
      }
      router.push("/login");
    });
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