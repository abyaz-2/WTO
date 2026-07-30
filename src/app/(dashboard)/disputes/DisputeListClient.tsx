"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
type Dispute = { id: string; disputeNumber: string; title: string; status: string; updatedAt: string };
async function api(path: string) { const { data: { session } } = await createClient().auth.getSession(); const res = await fetch(path, { headers: { Authorization: `Bearer ${session?.access_token}` } }); if (!res.ok) throw new Error("Could not load disputes"); return res.json(); }
const labels: Record<string, string> = { pending_eb_review: "Awaiting EB", third_party_response: "Third-party responses", statements_open: "Statements open", statements_closed: "EB report preparation", final_report_published: "Final report published", rejected: "Rejected" };
export default function DisputeListClient() {
  const [items, setItems] = useState<Dispute[]>([]); const [role, setRole] = useState("delegate");
  useEffect(() => { api("/api/v1/auth/session").then((x) => setRole(x.user?.role ?? "delegate")); api("/api/v1/disputes").then(setItems).catch(() => setItems([])); }, []);
  return <div className="p-6 sm:p-10 max-w-6xl mx-auto"><div className="flex items-end justify-between gap-4 mb-8"><div><p className="text-xs uppercase tracking-[.18em] text-[#6CA9FF]">Dispute settlement body</p><h1 className="text-3xl font-semibold text-white mt-2">Disputes</h1><p className="text-[#B6C3D1] mt-2">Track the formal written-dispute process.</p></div>{role === "delegate" && <Link className="px-4 py-2.5 rounded-lg bg-[#2E78E9] text-white text-sm font-medium" href="/disputes/new">Raise a dispute</Link>}</div><div className="border border-white/10 rounded-xl overflow-hidden bg-[#071B35]">{items.length === 0 ? <p className="p-10 text-center text-[#B6C3D1]">No disputes are available yet.</p> : items.map((item) => <Link key={item.id} href={`/disputes/${item.id}`} className="block p-5 border-b border-white/10 last:border-0 hover:bg-white/[.03]"><div className="flex justify-between gap-4"><div><p className="text-xs text-[#7D8DA0]">{item.disputeNumber}</p><h2 className="text-white font-medium mt-1">{item.title}</h2></div><span className="h-fit px-2.5 py-1 rounded-full text-xs bg-[#0B315D] text-[#9AC5FF]">{labels[item.status] ?? item.status}</span></div></Link>)}</div></div>;
}
