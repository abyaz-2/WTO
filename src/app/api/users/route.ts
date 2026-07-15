import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const mockUsers = [
    {
      id: "user-001",
      supabase_id: "sb-001",
      email: "alice.johnson@example.com",
      display_name: "Alice Johnson",
      avatar_url: null,
      role: "executive_board",
      is_active: true,
      last_login_at: "2026-06-15T09:00:00Z",
      created_at: "2026-01-15T09:00:00Z",
    },
    {
      id: "user-002",
      supabase_id: "sb-002",
      email: "bob.smith@example.com",
      display_name: "Bob Smith",
      avatar_url: null,
      role: "delegate",
      is_active: true,
      last_login_at: "2026-06-14T10:30:00Z",
      created_at: "2026-02-20T10:30:00Z",
    },
    {
      id: "user-003",
      supabase_id: "sb-003",
      email: "carol.williams@example.com",
      display_name: "Carol Williams",
      avatar_url: null,
      role: "delegate",
      is_active: true,
      last_login_at: null,
      created_at: "2026-03-10T08:00:00Z",
    },
    {
      id: "user-004",
      supabase_id: "sb-004",
      email: "david.brown@example.com",
      display_name: "David Brown",
      avatar_url: null,
      role: "delegate",
      is_active: false,
      last_login_at: "2026-04-05T11:00:00Z",
      created_at: "2026-04-05T11:00:00Z",
    },
    {
      id: "user-005",
      supabase_id: "sb-005",
      email: "eve.davis@example.com",
      display_name: "Eve Davis",
      avatar_url: null,
      role: "executive_board",
      is_active: true,
      last_login_at: "2026-06-13T13:00:00Z",
      created_at: "2026-05-12T13:00:00Z",
    },
  ];

  return NextResponse.json({ data: mockUsers, error: null });
}
