"use client";
import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Country = { id: string; name: string; assignmentId: string | null; email: string | null };
type CurrentUser = { country?: string | null };

async function request(path: string, init: RequestInit = {}) {
  const { data: { session } } = await createClient().auth.getSession();
  const r = await fetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${session?.access_token}` } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message ?? "Request failed");
  return j;
}

function CountryPicker({ label, hint, countries, selected, blocked, onToggle, onClear, required }: { label: string; hint: string; countries: Country[]; selected: string[]; blocked: string[]; onToggle: (id: string) => void; onClear: () => void; required?: boolean }) {
  return <section aria-labelledby={`${label}-label`} className="rounded-xl border border-white/10 bg-[#071B35] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id={`${label}-label`} className="text-sm font-semibold text-white">{label} {required && <span className="text-red-300">(required)</span>}</h2><p className="mt-1 text-xs text-[#7D8DA0]">{hint}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-[#0B315D] px-2.5 py-1 text-xs font-medium text-[#9AC5FF]">{selected.length} selected</span><button type="button" onClick={onClear} disabled={!selected.length} className="text-xs font-medium text-[#9AC5FF] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">Clear</button></div></div>
    <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
      {countries.map((country) => {
        const id = country.assignmentId!; const isSelected = selected.includes(id); const isBlocked = blocked.includes(id);
        return <label key={country.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors ${isSelected ? "border-[#2E78E9] bg-[#0B315D] text-white" : isBlocked ? "cursor-not-allowed border-white/5 bg-white/[.02] text-[#5B6878]" : "border-white/10 bg-[#05162D] text-[#DDE7F2] hover:border-[#6CA9FF]/70"}`}>
          <input type="checkbox" checked={isSelected} disabled={isBlocked} onChange={() => onToggle(id)} className="h-4 w-4 accent-[#2E78E9]" />
          <span className="min-w-0 truncate">{country.name}</span>{isBlocked && <span className="ml-auto text-[10px] uppercase tracking-wide">Other role</span>}
        </label>;
      })}
    </div>
  </section>;
}

export default function DisputeForm() {
  const router = useRouter(); const [countries, setCountries] = useState<Country[]>([]); const [me, setMe] = useState<CurrentUser>(); const [complainants, setComplainants] = useState<string[]>([]); const [respondents, setRespondents] = useState<string[]>([]); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { request("/api/v1/countries").then(setCountries).catch((e) => setError(e.message)); request("/api/v1/users/me").then(setMe).catch((e) => setError(e.message)); }, []);
  const assigned = countries.filter((c) => c.assignmentId); const own = countries.find((c) => c.name === me?.country);
  const toggle = (set: Dispatch<SetStateAction<string[]>>, id: string) => set((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const form = new FormData(event.currentTarget); const allComplainants = own?.assignmentId ? [...new Set([...complainants, own.assignmentId])] : complainants;
      if (!respondents.length) throw new Error("Select at least one respondent country.");
      const dispute = await request("/api/v1/disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), complainantAssignmentIds: allComplainants, respondentAssignmentIds: respondents }) });
      router.push(`/disputes/${dispute.id}`);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  const selectable = assigned.filter((country) => country.assignmentId !== own?.assignmentId);
  return <div className="mx-auto max-w-4xl p-6 sm:p-10"><p className="text-xs uppercase tracking-[.18em] text-[#6CA9FF]">New filing</p><h1 className="mt-2 text-3xl font-semibold text-white">Raise a dispute</h1><p className="mb-8 mt-2 text-[#B6C3D1]">Your filing goes directly to the Executive Board for review.</p><form onSubmit={submit} className="space-y-6"><label className="block text-sm text-white">Title<input required name="title" maxLength={200} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0B2345] px-3 py-2.5" /></label><label className="block text-sm text-white">Description<textarea required name="description" rows={7} className="mt-2 w-full rounded-lg border border-white/10 bg-[#0B2345] px-3 py-2.5" /></label>
    <div className="rounded-xl border border-[#2E78E9]/30 bg-[#0B315D]/40 px-4 py-3 text-sm text-[#BFD9FF]">Your country, <strong>{own?.name ?? "your delegation"}</strong>, is included as a complainant automatically.</div>
    <CountryPicker label="Complainant countries" hint="Select any additional countries joining the complaint." countries={selectable} selected={complainants} blocked={respondents} onToggle={(id) => toggle(setComplainants, id)} onClear={() => setComplainants([])} />
    <CountryPicker label="Respondent countries" hint="Select every country named in the complaint." required countries={selectable} selected={respondents} blocked={complainants} onToggle={(id) => toggle(setRespondents, id)} onClear={() => setRespondents([])} />
    {error && <p className="text-sm text-red-300" role="alert">{error}</p>}<button disabled={saving} className="rounded-lg bg-[#2E78E9] px-5 py-2.5 font-medium text-white disabled:opacity-50">{saving ? "Submitting…" : "Submit to Executive Board"}</button></form></div>;
}
