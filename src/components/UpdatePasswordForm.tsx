"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError("Invalid or expired reset link. Please request a new one.");
      }
      setCheckingSession(false);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#B6C3D1]">Verifying your reset link...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-[rgba(34,197,94,0.15)] flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Password Updated</h2>
        <p className="text-sm text-[#B6C3D1]">Redirecting to sign in...</p>
      </div>
    );
  }

  if (error && !password) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Invalid Link</h2>
        <p className="text-sm text-[#B6C3D1] leading-relaxed mb-4">{error}</p>
        <Link href="/forgot-password" className="text-sm text-[#6CA9FF] hover:underline font-semibold">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-8">
        <p className="text-xs text-[#B6C3D1] leading-relaxed">
          Choose a new password for your account.
        </p>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold tracking-wider uppercase text-[#B6C3D1] mb-3"
          >
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-10 px-5 text-xs text-white bg-[#05162D] border border-[rgba(255,255,255,0.35)] rounded-lg placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] focus:ring-1 focus:ring-[#1E6FE8]/20 transition-all duration-200"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold tracking-wider uppercase text-[#B6C3D1] mb-3"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-10 px-5 text-xs text-white bg-[#05162D] border border-[rgba(255,255,255,0.35)] rounded-lg placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] focus:ring-1 focus:ring-[#1E6FE8]/20 transition-all duration-200"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 leading-relaxed">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 text-xs font-semibold text-white bg-[#1E6FE8] rounded-lg hover:bg-[#1A5FC4] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>
    </form>
  );
}
