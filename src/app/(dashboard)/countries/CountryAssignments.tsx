"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Country = {
  id: string;
  name: string;
  assignmentId: string | null;
  email: string | null;
};

type Credential = { country: string; email: string; password: string };

async function request(path: string, init: RequestInit = {}) {
  const { data: { session } } = await createClient().auth.getSession();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      Authorization: `Bearer ${session?.access_token}`,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.error?.message ?? "Request failed");
  return data;
}

export default function CountryAssignments() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryId, setCountryId] = useState("");
  const [email, setEmail] = useState("");
  const [credential, setCredential] = useState<Credential | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setCountries(await request("/api/v1/countries"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load countries.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(event: FormEvent) {
    event.preventDefault();
    setError("");

    try {
      setCredential(await request("/api/v1/countries", {
        method: "POST",
        body: JSON.stringify({ countryId, email }),
      }));
      setEmail("");
      setCountryId("");
      await load();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Could not generate the login.");
    }
  }

  async function reassignCredential(country: Country) {
    const nextEmail = window.prompt(`New email for ${country.name}:`, country.email ?? "");
    if (!nextEmail) return;

    setError("");
    try {
      setCredential(await request("/api/v1/countries", {
        method: "PATCH",
        body: JSON.stringify({ countryId: country.id, email: nextEmail }),
      }));
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not reassign the login.");
    }
  }

  const unassignedCountries = countries.filter((country) => !country.assignmentId);

  return (
    <div className="mx-auto max-w-[var(--content-width,1200px)] p-6 sm:p-10 lg:p-12">
      <header className="border-b border-white/10 pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6CA9FF]">Executive board</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Country credentials</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#B6C3D1]">
          Assign and manage one secure delegate login for each country delegation.
        </p>
      </header>

      <form onSubmit={assign} className="mt-8 grid gap-3 rounded-xl border border-white/10 bg-[#0B2345] p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="sr-only" htmlFor="country">Country</label>
        <select id="country" required value={countryId} onChange={(event) => setCountryId(event.target.value)} className="min-w-0 rounded-lg border border-white/10 bg-[#05162D] px-3 py-2.5 text-sm text-white focus:border-[#6CA9FF] focus:outline-none">
          <option value="">Select an unassigned country</option>
          {unassignedCountries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="delegate-email">Delegate email</label>
        <input id="delegate-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="delegate@example.com" className="min-w-0 rounded-lg border border-white/10 bg-[#05162D] px-3 py-2.5 text-sm text-white placeholder:text-[#7D8DA0] focus:border-[#6CA9FF] focus:outline-none" />
        <button className="rounded-lg bg-[#1E6FE8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A5FC4]">Generate login</button>
      </form>

      {error && <p className="mt-4 text-sm text-red-300" role="alert">{error}</p>}

      <section className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-[#0B2345]">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#7D8DA0]">
          <span>Delegation</span><span>Access</span>
        </div>
        {countries.map((country) => (
          <div key={country.id} className="grid grid-cols-1 items-center gap-3 border-b border-white/10 px-5 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto]">
            <span className="font-medium text-white">{country.name}</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className={country.email ? "text-[#B6C3D1]" : "text-[#7D8DA0]"}>{country.email ?? "Unassigned"}</span>
              {credential?.country === country.name && credential.email === country.email && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs text-amber-100" aria-live="polite">
                  Password <code className="font-semibold">{credential.password}</code>
                </span>
              )}
              {country.assignmentId && <button type="button" onClick={() => reassignCredential(country)} className="text-xs font-medium text-[#9AC5FF] hover:text-white">Reassign</button>}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
