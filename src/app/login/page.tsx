"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthenticationDetails, CognitoUser } from "amazon-cognito-identity-js";
import { userPool } from "@/lib/cognito";
import Cookies from "js-cookie";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const user = new CognitoUser({ Username: email, Pool: userPool });
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const idToken = session.getIdToken().getJwtToken();
        Cookies.set("idToken", idToken, { expires: 1 });

        const role = session.getIdToken().payload["custom:role"];
        router.push(`/${role}`);
      },
      onFailure: (err) => {
        setError(err.message);
      },
    });
  }

  return (
    <form onSubmit={handleLogin} className="max-w-sm mx-auto mt-10 space-y-3">
      <h1 className="text-xl font-bold">Log in</h1>
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
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" className="bg-violet-600 text-white p-2 w-full rounded">
        Log in
      </button>
    </form>
  );
}