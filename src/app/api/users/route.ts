import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const mockUsers = [
    {
      id: "user-001",
      name: "Alice Johnson",
      email: "alice.johnson@example.com",
      role: "editor",
      avatar: null,
      createdAt: "2026-01-15T09:00:00Z",
    },
    {
      id: "user-002",
      name: "Bob Smith",
      email: "bob.smith@example.com",
      role: "reviewer",
      avatar: null,
      createdAt: "2026-02-20T10:30:00Z",
    },
    {
      id: "user-003",
      name: "Carol Williams",
      email: "carol.williams@example.com",
      role: "admin",
      avatar: null,
      createdAt: "2026-03-10T08:00:00Z",
    },
    {
      id: "user-004",
      name: "David Brown",
      email: "david.brown@example.com",
      role: "viewer",
      avatar: null,
      createdAt: "2026-04-05T11:00:00Z",
    },
    {
      id: "user-005",
      name: "Eve Davis",
      email: "eve.davis@example.com",
      role: "editor",
      avatar: null,
      createdAt: "2026-05-12T13:00:00Z",
    },
  ];

  return NextResponse.json({ data: mockUsers, error: null });
}
