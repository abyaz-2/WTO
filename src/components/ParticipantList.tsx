"use client";

import { motion } from "framer-motion";
import { useState } from "react";
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
}

function RoleModal({ isOpen, onClose, onSelect }: RoleModalProps) {
  if (!isOpen) return null;

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
            onClick={() => onSelect("respondent")}
            className="w-full px-4 py-3 text-sm font-medium text-left text-white bg-[#112F5A] hover:bg-[#1a3f6f] rounded-[8px] transition-colors"
          >
            Respondent
          </button>
          <button
            onClick={() => onSelect("third_party")}
            className="w-full px-4 py-3 text-sm font-medium text-left text-white bg-[#112F5A] hover:bg-[#1a3f6f] rounded-[8px] transition-colors"
          >
            Third Party
          </button>
        </div>
        <button
          onClick={onClose}
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
        onSelect={(role) => {
          console.log("Register as", role, "for issue", issueId);
          setShowRoleModal(false);
        }}
      />
    </>
  );
}
