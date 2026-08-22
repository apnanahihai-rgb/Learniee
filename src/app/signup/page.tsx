"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CognitoUserAttribute } from "amazon-cognito-identity-js";
import { userPool } from "@/lib/cognito";

export default function SignupPage() {
  const [role, setRole] = useState<"parent" | "teacher">("parent");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState(""); // just the 10-digit number, +91 added automatically
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    const fullPhone = `+91${phone}`;

    const attrs = [
      new CognitoUserAttribute({ Name: "custom:role", Value: role }),
      new CognitoUserAttribute({ Name: "given_name", Value: firstName }),
      new CognitoUserAttribute({ Name: "family_name", Value: lastName }),
      new CognitoUserAttribute({ Name: "phone_number", Value: fullPhone }),
    ];

    userPool.signUp(email, password, attrs, [], (err) => {
      if (err) {
        setError(err.message);
        return;
      }
      // Cognito auto-verified email OTP is used for confirmation (per pool config)
      router.push(`/confirm?email=${encodeURIComponent(email)}`);
    });
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      {/* Role tabs */}
      <div className="flex mb-6 border rounded overflow-hidden">
        <button
          type="button"
          onClick={() => setRole("parent")}
          className={`flex-1 p-2 font-medium ${
            role === "parent" ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          Parent
        </button>
        <button
          type="button"
          onClick={() => setRole("teacher")}
          className={`flex-1 p-2 font-medium ${
            role === "teacher" ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          Teacher
        </button>
      </div>

      <form onSubmit={handleSignup} className="space-y-3">
        <h1 className="text-xl font-bold">
          {role === "parent" ? "Parent Sign up" : "Teacher Sign up"}
        </h1>

        <input required placeholder="First Name" value={firstName}
          onChange={(e) => setFirstName(e.target.value)} className="border p-2 w-full" />
        <input required placeholder="Last Name" value={lastName}
          onChange={(e) => setLastName(e.target.value)} className="border p-2 w-full" />

        <div className="flex border rounded overflow-hidden">
          <span className="bg-gray-100 px-3 flex items-center text-gray-600">+91</span>
          <input
            required
            placeholder="Phone number"
            value={phone}
            maxLength={10}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            className="p-2 w-full outline-none"
          />
        </div>

        <input type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} className="border p-2 w-full" />
        <input type="password" required placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} className="border p-2 w-full" />
        <input type="password" required placeholder="Confirm Password" value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)} className="border p-2 w-full" />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" className="bg-violet-600 text-white p-2 w-full rounded">
          Sign up
        </button>
      </form>
    </div>
  );
}