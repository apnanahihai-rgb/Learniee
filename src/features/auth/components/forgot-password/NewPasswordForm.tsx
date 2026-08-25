"use client";

interface NewPasswordFormProps {
  newPassword: string;
  confirmPassword: string;

  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;

  onSubmit: () => void;

  showPassword: boolean;
  showConfirmPassword: boolean;

  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;

  loading: boolean;
  error?: string;
}

export default function NewPasswordForm({
  newPassword,
  confirmPassword,

  onNewPasswordChange,
  onConfirmPasswordChange,

  onSubmit,

  showPassword,
  showConfirmPassword,

  onTogglePassword,
  onToggleConfirmPassword,

  loading,
  error,
}: NewPasswordFormProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">
          Create New Password
        </h2>

        <p className="text-sm text-gray-500 mt-2">
          Enter your new password below.
        </p>
      </div>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="New Password"
          value={newPassword}
          onChange={(e) =>
            onNewPasswordChange(e.target.value)
          }
          className="border rounded-full p-3 w-full outline-none"
        />

        <button
          type="button"
          onClick={onTogglePassword}
          className="absolute right-4 top-3 text-sm text-gray-500"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>

      <div className="relative">
        <input
          type={
            showConfirmPassword
              ? "text"
              : "password"
          }
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) =>
            onConfirmPasswordChange(e.target.value)
          }
          className="border rounded-full p-3 w-full outline-none"
        />

        <button
          type="button"
          onClick={onToggleConfirmPassword}
          className="absolute right-4 top-3 text-sm text-gray-500"
        >
          {showConfirmPassword ? "Hide" : "Show"}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Password must contain at least 8 characters,
        one uppercase letter, one lowercase letter,
        and one number.
      </p>

      {error && (
        <p className="text-red-600 text-sm text-center">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="w-full rounded-full py-3 text-white font-semibold bg-violet-600 disabled:opacity-60"
      >
        {loading
          ? "Changing Password..."
          : "Change Password"}
      </button>
    </div>
  );
}