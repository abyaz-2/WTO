"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface LoginFormProps {
  onSuccess: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "default": "An unexpected error occurred. Please try again.",
};

function formatError(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") {
    const obj = detail as Record<string, unknown>;
    return String(obj.message || obj.detail || JSON.stringify(obj));
  }
  return "An unexpected error occurred.";
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(formatError(body.detail) || ERROR_MESSAGES.default);
        setLoading(false);
        return;
      }

      const { access_token, refresh_token } = body.data;

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        setError(ERROR_MESSAGES.default);
        setLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError(ERROR_MESSAGES.default);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-8">
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

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold tracking-wider uppercase text-[#B6C3D1] mb-3"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            className="w-full h-10 px-5 text-xs text-white bg-[#05162D] border border-[rgba(255,255,255,0.35)] rounded-lg placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] focus:ring-1 focus:ring-[#1E6FE8]/20 transition-all duration-200"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 leading-relaxed">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 text-xs font-semibold text-white bg-[#1E6FE8] rounded-lg hover:bg-[#1A5FC4] mt-10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>

      <p className="text-center mt-6 text-xs text-[#B6C3D1]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-[#1E6FE8] hover:underline font-semibold">
          Sign up
        </Link>
      </p>
    </form>
  );
}
