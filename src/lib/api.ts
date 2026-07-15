"use client";

import { createClient } from "@/lib/supabase/client";
import type { PaginatedResponse, ApiError } from "@/lib/types";

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      const error: ApiError = {
        status: response.status,
        detail: await response.text().catch(() => "Request failed"),
      };
      throw error;
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    const fullPath = query ? `${path}?${query}` : path;
    return this.request<T>(fullPath, { method: "GET" });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient();

export interface IssueListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  sort?: string;
}

export function fetchIssues(params: IssueListParams = {}): Promise<PaginatedResponse<import("@/lib/types").Issue>> {
  return api.get("/issues", params as Record<string, string | number | undefined>);
}

export function fetchIssue(id: string): Promise<import("@/lib/types").Issue> {
  return api.get(`/issues/${id}`);
}

export function fetchParticipants(issueId: string): Promise<import("@/lib/types").Participant[]> {
  return api.get(`/issues/${issueId}/participants`);
}

export function fetchSubmissions(issueId: string): Promise<import("@/lib/types").Submission[]> {
  return api.get(`/issues/${issueId}/submissions`);
}

export function fetchUsers(): Promise<import("@/lib/types").User[]> {
  return api.get("/users");
}

export function createUser(data: {
  email: string;
  display_name: string;
  role: string;
}): Promise<import("@/lib/types").User> {
  return api.post("/users", data);
}


