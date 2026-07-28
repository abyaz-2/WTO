"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Participant, IssueStatus } from "@/lib/types";

interface ParticipantListProps {
  participants?: Participant[];
  issueStatus: IssueStatus;
  issueId: string;
}

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (role: string) => void;
  issueId: string;
  onRegistered: () => void;
  onError: (msg: string) => void;
}

function RoleModal({ isOpen, onClose, onSelect, issueId, onRegistered, onError }: RoleModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (role: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        onError("Not authenticated");
        onClose();
        return;
      }
      const res = await fetch(`/api/v1/issues/${issueId}/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "Registration failed");
        onError(err);
      } else {
        onRegistered();
      }
    } catch {
      onError("Registration failed");
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#0B2345] border border-[rgba(255,255,255,0.08)] rounded-[12px] p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-white mb-1">Register for Issue</h3>
        <p className="text-sm text-[#B6C3D1] mb-5">Select your role</p>
        <div className="space-y-2">
          <button
            onClick={() => handleSelect("respondent")}
            disabled={loading}
            className="w-full px-4 py-3 text-sm font-medium text-left text-white bg-[#112F5A] hover:bg-[#1a3f6f] disabled:opacity-50 rounded-[8px] transition-colors"
          >
            {loading ? "Registering..." : "Respondent"}
          </button>
          <button
            onClick={() => handleSelect("third_party")}
            disabled={loading}
            className="w-full px-4 py-3 text-sm font-medium text-left text-white bg-[#112F5A] hover:bg-[#1a3f6f] disabled:opacity-50 rounded-[8px] transition-colors"
          >
            {loading ? "Registering..." : "Third Party"}
          </button>
        </div>
        <button
          onClick={onClose}
          disabled={loading}
          className="w-full mt-3 px-4 py-2.5 text-sm text-[#B6C3D1] hover:text-white transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  );
}

function ParticipantAvatar({ participant }: { participant: Participant }) {
  const initials = participant.user?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "??";

  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-xs font-medium text-[#B6C3D1] flex-shrink-0">
        {initials}
      </div>
      <div>
        <p className="text-sm font-medium text-white">
          {participant.user?.display_name ?? "Unknown"}
        </p>
        <p className="text-xs text-[#7D8DA0]">
          {participant.user?.email ?? ""}
        </p>
      </div>
    </div>
  );
}

export default function ParticipantList({ participants, issueStatus, issueId }: ParticipantListProps) {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const refetchKey = useState(0);

  const grouped = {
    complainant: (participants ?? []).filter((p) => p.role === "complainant"),
    respondent: (participants ?? []).filter((p) => p.role === "respondent"),
    third_party: (participants ?? []).filter((p) => p.role === "third_party"),
  };

  return (
    <>
      <div className="space-y-6">
        {grouped.complainant.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-[#7D8DA0] mb-3">Complainant</h4>
            <div className="space-y-3">
              {grouped.complainant.map((p) => (
                <ParticipantAvatar key={p.id} participant={p} />
              ))}
            </div>
          </div>
        )}

        {grouped.respondent.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-[#7D8DA0] mb-3">Respondent</h4>
            <div className="space-y-3">
              {grouped.respondent.map((p) => (
                <ParticipantAvatar key={p.id} participant={p} />
              ))}
            </div>
          </div>
        )}

        {grouped.third_party.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-[#7D8DA0] mb-3">Third Parties</h4>
            <div className="space-y-3">
              {grouped.third_party.map((p) => (
                <ParticipantAvatar key={p.id} participant={p} />
              ))}
            </div>
          </div>
        )}

        {participants && participants.length === 0 && (
          <p className="text-sm text-[#7D8DA0]">No participants registered yet.</p>
        )}

        {registerError && (
          <p className="text-xs text-red-400">{registerError}</p>
        )}

        {issueStatus === "registration_open" && (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowRoleModal(true)}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#1E6FE8] hover:bg-[#1A5FC8] rounded-[8px] transition-colors"
          >
            Register for This Issue
          </motion.button>
        )}
      </div>

      <RoleModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSelect={() => {}}
        issueId={issueId}
        onRegistered={() => {
          refetchKey[1]((k) => k + 1);
          window.location.reload();
        }}
        onError={(msg) => setRegisterError(msg)}
      />
    </>
  );
}
