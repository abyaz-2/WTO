"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/update-password` },
      );
      if (resetError) {
        setError(resetError.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-[rgba(30,111,232,0.15)] flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[#6CA9FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
        <p className="text-sm text-[#B6C3D1] leading-relaxed">
          We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>.
        </p>
        <p className="text-xs text-[#7D8DA0] mt-4">
          Didn&apos;t receive the email?{" "}
          <button onClick={() => setSent(false)} className="text-[#6CA9FF] hover:underline">
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-8">
        <p className="text-xs text-[#B6C3D1] leading-relaxed">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold tracking-wider uppercase text-[#B6C3D1] mb-3"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="delegate@wto.int"
            required
            autoComplete="email"
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
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </div>

      <p className="text-center mt-6 text-xs text-[#B6C3D1]">
        Remember your password?{" "}
        <Link href="/login" className="text-[#1E6FE8] hover:underline font-semibold">
          Sign in
        </Link>
      </p>
    </form>
  );
}
