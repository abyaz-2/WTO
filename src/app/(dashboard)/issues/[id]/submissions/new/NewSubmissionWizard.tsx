"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Skeleton from "@/components/Skeleton";

interface NewSubmissionWizardProps {
  issueId: string;
}

const COMPLAINANT_STEPS = ["Issue Description", "Legal Basis", "Requested Remedy", "Review & Submit"];
const RESPONDENT_STEPS = ["Defense", "Legal Arguments", "Requested Outcome", "Review & Submit"];
const THIRD_PARTY_STEPS = ["Trade Interest", "Position", "Supporting Arguments", "Review & Submit"];

export default function NewSubmissionWizard({ issueId }: NewSubmissionWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const { data: participant, isLoading } = useQuery({
    queryKey: ["my-participation", issueId],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase
        .from("participants")
        .select("role")
        .eq("issue_id", issueId)
        .eq("user_id", user.id)
        .single();
      return data as { role: string } | null;
    },
  });

  const role = participant?.role || "complainant";
  const steps = role === "respondent" ? RESPONDENT_STEPS : role === "third_party" ? THIRD_PARTY_STEPS : COMPLAINANT_STEPS;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.from("submissions").insert({
        issue_id: issueId,
        submission_type: "written_statement",
        content: formData,
        status: "submitted",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      router.push(`/dashboard/issues/${issueId}/submissions`);
    },
  });

  if (isLoading) return <div className="p-8"><Skeleton variant="card" /></div>;

  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const renderStep = () => {
    switch (steps[step]) {
      case "Issue Description":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium tracking-wider uppercase text-[#B6C3D1]">Summary</label>
              <textarea
                value={formData.summary || ""}
                onChange={(e) => updateField("summary", e.target.value)}
                className="w-full h-32 px-4 py-3 text-sm text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors resize-none"
                placeholder="Brief summary of the grievance..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium tracking-wider uppercase text-[#B6C3D1]">Factual Background</label>
              <textarea
                value={formData.factual_background || ""}
                onChange={(e) => updateField("factual_background", e.target.value)}
                className="w-full h-48 px-4 py-3 text-sm text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors resize-none"
                placeholder="Detailed chronology of events..."
              />
            </div>
          </div>
        );
      case "Legal Basis":
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium tracking-wider uppercase text-[#B6C3D1]">Claims</label>
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#112F5A]">
                    <p className="text-xs text-[#6CA9FF] mb-2">Claim {i + 1}</p>
                    <input
                      value={formData[`claim_${i}_agreement`] || ""}
                      onChange={(e) => updateField(`claim_${i}_agreement`, e.target.value)}
                      className="w-full mb-2 px-3 py-2 text-sm text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8]"
                      placeholder="WTO Agreement (e.g., GATT 1994 Art. I)"
                    />
                    <textarea
                      value={formData[`claim_${i}_reasoning`] || ""}
                      onChange={(e) => updateField(`claim_${i}_reasoning`, e.target.value)}
                      className="w-full h-20 px-3 py-2 text-sm text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] resize-none"
                      placeholder="Legal reasoning..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "Requested Remedy":
      case "Defense":
      case "Legal Arguments":
      case "Requested Outcome":
      case "Trade Interest":
      case "Position":
      case "Supporting Arguments":
        return (
          <div className="flex flex-col gap-4">
            <p className="text-[#B6C3D1] text-sm">Enter your {steps[step].toLowerCase()} for this dispute.</p>
            <textarea
              value={formData[steps[step]] || ""}
              onChange={(e) => updateField(steps[step], e.target.value)}
              className="w-full h-64 px-4 py-3 text-sm text-white bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[8px] placeholder:text-[#7D8DA0] focus:outline-none focus:border-[#1E6FE8] transition-colors resize-none"
              placeholder={`Enter your ${steps[step].toLowerCase()}...`}
            />
          </div>
        );
      case "Review & Submit":
        return (
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Review Your Submission</h3>
            <div className="p-4 rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[#112F5A]">
              <pre className="text-sm text-[#B6C3D1] whitespace-pre-wrap font-sans">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>
            {submitMutation.isError && (
              <p className="text-sm text-red-400">Failed to submit. Please try again.</p>
            )}
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="w-full py-3 text-sm font-semibold text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] disabled:opacity-50 transition-colors"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 sm:p-12">
      <div className="max-w-[var(--content-width,1200px)] mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-bold text-2xl text-white tracking-tight capitalize">{role} Submission</h1>
            <span className="text-xs text-[#7D8DA0]">Step {step + 1} of {steps.length}</span>
          </div>
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i <= step ? "bg-[#1E6FE8]" : "bg-[rgba(255,255,255,0.08)]"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            {steps.map((s, i) => (
              <span key={s} className={`flex-1 text-[10px] text-center ${
                i <= step ? "text-[#6CA9FF]" : "text-[#7D8DA0]"
              }`}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {renderStep()}

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-6 py-2.5 text-sm text-[#B6C3D1] border border-[rgba(255,255,255,0.08)] rounded-[8px] hover:bg-[#0B2345] disabled:opacity-30 transition-colors"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#1E6FE8] rounded-[8px] hover:bg-[#1A5FC4] transition-colors"
            >
              Next
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
