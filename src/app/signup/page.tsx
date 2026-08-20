"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CognitoUserAttribute } from "amazon-cognito-identity-js";
import { userPool } from "@/lib/cognito";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"parent" | "teacher">("parent");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const attrs = [new CognitoUserAttribute({ Name: "custom:role", Value: role })];

    userPool.signUp(email, password, attrs, [], (err) => {
      if (err) {
        setError(err.message);
        return;
      }
      router.push(`/confirm?email=${encodeURIComponent(email)}`);
    });
  }

  return (
    <form onSubmit={handleSignup} className="max-w-sm mx-auto mt-10 space-y-3">
      <h1 className="text-xl font-bold">Sign up</h1>
      <input
        type="email"
        required
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 w-full"
      />
      <input
        type="password"
        required
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 w-full"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as "parent" | "teacher")}
        className="border p-2 w-full"
      >
        <option value="parent">Parent</option>
        <option value="teacher">Teacher</option>
      </select>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-violet-600 text-white p-2 w-full rounded">
        Sign up
      </button>
    </form>
  );
}