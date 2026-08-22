"use client";

import Link from "next/link";

import LoginInput from "./LoginInput";
import PasswordInput from "./PasswordInput";
import { useLogin } from "@/hooks/useLogin";

const PRIMARY = "#7E2BF1";

export default function LoginForm() {
  const {
    email,
    password,
    error,
    loading,

    showPassword,

    setEmail,
    setPassword,
    setShowPassword,

    handleLogin,
  } = useLogin();

  return (
    <div className="w-full md:w-1/2 bg-white rounded-[32px] shadow-2xl p-8 md:-mr-8 z-10 min-h-[575px] flex items-center">
      <div className="w-full">
        {/* Heading */}
        <h1
          className="text-2xl font-bold text-center mb-12"
          style={{ color: PRIMARY }}
        >
          User Login
        </h1>

        <form
          onSubmit={handleLogin}
          className="space-y-5"
          noValidate
        >
          {/* Email */}
          <LoginInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            disabled={loading}
          />

          {/* Password */}
          <PasswordInput
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            showPassword={showPassword}
            onToggle={() =>
              setShowPassword(
                (value) => !value
              )
            }
            disabled={loading}
          />

          {/* Forgot Password */}
          <div className="flex justify-end -mt-2">
            <Link
              href="/forgot-password"
              className="text-sm text-violet-600 hover:underline"
            >
              Forgot Password
            </Link>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 text-center">
              {error}
            </p>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-3 text-white font-semibold text-lg disabled:opacity-60 transition"
            style={{
              backgroundColor: PRIMARY,
            }}
          >
            {loading
              ? "Logging in..."
              : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}