"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  "Conflict": "A user with this email already exists.",
  "default": "An unexpected error occurred. Please try again.",
};

interface SignupFormProps {
  onSuccess: () => void;
}

export default function SignupForm({ onSuccess }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"delegate" | "executive_board">("delegate");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          display_name: displayName.trim(),
          role,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        const message = body.detail || body.error || ERROR_MESSAGES.default;
        setError(message);
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
            htmlFor="displayName"
            className="block text-xs font-semibold tracking-wider uppercase text-[#B6C3D1] mb-3"
          >
            Display Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your full name"
            required
            autoComplete="name"
            className="w-full h-10 px-5 text-xs text-white bg-[#05162D] border border-[rgba(255,255,255,0.35)] rounded-lg placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] focus:ring-1 focus:ring-[#1E6FE8]/20 transition-all duration-200"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="block text-xs font-semibold tracking-wider uppercase text-[#B6C3D1] mb-3"
          >
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as "delegate" | "executive_board")}
            className="w-full h-10 px-5 text-xs text-white bg-[#05162D] border border-[rgba(255,255,255,0.35)] rounded-lg focus:outline-none focus:border-[#1E6FE8] focus:ring-1 focus:ring-[#1E6FE8]/20 transition-all duration-200"
          >
            <option value="delegate" className="bg-[#05162D]">Delegate</option>
            <option value="executive_board" className="bg-[#05162D]">Executive Board</option>
          </select>
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
            Confirm Password
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
          className="w-full h-10 text-xs font-semibold text-white bg-[#1E6FE8] rounded-lg hover:bg-[#1A5FC4] mt-5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </div>

      <p className="text-center mt-6 text-xs text-[#B6C3D1]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#1E6FE8] hover:underline font-semibold">
          Sign in
        </Link>
      </p>
    </form>
  );
}
