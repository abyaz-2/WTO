"use client";

import type { ReactNode } from "react";

interface PublicationCertificateProps {
  disputeNumber: string;
  disputeTitle: string;
  publicationDate: string;
  panelMembers: string[];
  sha256Hash: string;
}

export default function PublicationCertificate({
  disputeNumber,
  disputeTitle,
  publicationDate,
  panelMembers,
  sha256Hash,
}: PublicationCertificateProps): ReactNode {
  return (
    <div className="rounded-[12px] border border-[rgba(255,255,255,0.16)] bg-[#0B2345] p-8 max-w-2xl mx-auto">
      <div className="text-center border-b border-[rgba(255,255,255,0.08)] pb-6 mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#112F5A] border-2 border-[rgba(255,255,255,0.16)] flex items-center justify-center">
          <span className="text-lg font-bold text-white">WTO</span>
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">WORLD TRADE ORGANIZATION</h2>
        <p className="text-xs text-[#7D8DA0] mt-1">Dispute Settlement Body</p>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0]">Dispute Number</p>
          <p className="text-sm font-semibold text-white mt-1">{disputeNumber}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0]">Title</p>
          <p className="text-sm text-[#B6C3D1] mt-1 leading-relaxed">{disputeTitle}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0]">Publication Date</p>
          <p className="text-sm text-[#B6C3D1] mt-1">
            {new Date(publicationDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0]">Panel Members</p>
          <ul className="mt-1 space-y-1">
            {panelMembers.map((member, idx) => (
              <li key={idx} className="text-sm text-[#B6C3D1]">
                {member}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-[11px] font-medium tracking-wider uppercase text-[#7D8DA0] mb-1">SHA-256 Verification</p>
            <code className="text-[10px] font-mono text-[#6CA9FF] break-all bg-[#05162D] px-3 py-2 rounded-[6px] block leading-relaxed">
              {sha256Hash}
            </code>
          </div>
          <div className="flex-shrink-0 w-20 h-20 bg-[#112F5A] border border-[rgba(255,255,255,0.08)] rounded-[8px] flex items-center justify-center">
            <div className="text-center">
              <div className="grid grid-cols-5 gap-0.5 mx-auto w-12 h-12">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-[1px] ${Math.random() > 0.5 ? "bg-[#1E6FE8]" : "bg-[#112F5A]"}`}
                    style={{ opacity: 0.3 + Math.random() * 0.7 }}
                  />
                ))}
              </div>
              <p className="text-[8px] text-[#7D8DA0] mt-1">QR Code</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
