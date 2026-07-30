function normalizeSupabaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
}

export function getSupabaseUrl(): string {
  const rawUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!rawUrl) {
    throw new Error("Missing Supabase URL. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.");
  }

  return normalizeSupabaseUrl(rawUrl);
}

export function getSupabaseAnonKey(): string {
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error("Missing Supabase publishable key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  return anonKey;
}
