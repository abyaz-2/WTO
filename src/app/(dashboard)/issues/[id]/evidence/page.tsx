"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import EvidenceUpload from "@/components/EvidenceUpload";

interface EvidenceItem {
  id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  description: string | null;
  status: string;
  created_at: string;
  participant_id: string;
}

export default function EvidencePage() {
  const params = useParams();
  const issueId = params.id as string;

  const { data: evidence, isLoading, error, refetch } = useQuery({
    queryKey: ["evidence", issueId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("evidence")
        .select("*")
        .eq("issue_id", issueId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EvidenceItem[];
    },
  });

  if (isLoading) return <div className="p-8"><Skeleton variant="card" /><Skeleton variant="card" /><Skeleton variant="card" /></div>;

  if (error) return <div className="p-8"><EmptyState title="Failed to load evidence" description="An error occurred while loading evidence." action={{ label: "Retry", onClick: () => refetch() }} /></div>;

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-bold text-2xl text-white tracking-tight">Evidence</h1>
            <p className="text-[#B6C3D1] mt-1 text-sm">Supporting documents filed for this dispute.</p>
          </div>
          <EvidenceUpload issueId={issueId} />
        </div>

        {(!evidence || evidence.length === 0) ? (
          <EmptyState
            icon="file"
            title="No evidence filed yet"
            description="Evidence will appear here once participants upload supporting documents."
          />
        ) : (
          <div className="grid gap-4">
            {evidence.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
                className="flex items-center gap-4 p-4 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-[#0B2345]"
              >
                <div className="w-10 h-10 rounded-[8px] bg-[#112F5A] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#6CA9FF] text-sm font-semibold">
                    {item.file_type?.includes("pdf") ? "PDF" : item.file_type?.includes("image") ? "IMG" : "DOC"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate font-medium">{item.description || "Untitled evidence"}</p>
                  <p className="text-xs text-[#7D8DA0] mt-0.5">
                    {(item.file_size / 1024 / 1024).toFixed(2)} MB &middot; {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  item.status === "validated" ? "bg-[rgba(34,197,94,0.12)] text-[#22C55E]" :
                  item.status === "rejected" ? "bg-[rgba(239,68,68,0.12)] text-[#EF4444]" :
                  "bg-[rgba(255,255,255,0.06)] text-[#B6C3D1]"
                }`}>
                  {item.status}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
