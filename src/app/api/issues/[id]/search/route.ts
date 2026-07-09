import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  const mockResults = [
    {
      id: "res-001",
      title: "Related Document A",
      type: "document",
      snippet: "This document contains information relevant to the search query.",
      relevance: 0.95,
    },
    {
      id: "res-002",
      title: "Related Article B",
      type: "article",
      snippet: "An article discussing topics related to the search terms.",
      relevance: 0.87,
    },
    {
      id: "res-003",
      title: "Reference Material C",
      type: "reference",
      snippet: "Reference material that matches the search query.",
      relevance: 0.72,
    },
  ];

  const filteredResults = q
    ? mockResults.filter(
        (r) =>
          r.title.toLowerCase().includes(q.toLowerCase()) ||
          r.snippet.toLowerCase().includes(q.toLowerCase())
      )
    : mockResults;

  return NextResponse.json({
    data: {
      issueId: id,
      query: q,
      results: filteredResults,
      total: filteredResults.length,
    },
    error: null,
  });
}