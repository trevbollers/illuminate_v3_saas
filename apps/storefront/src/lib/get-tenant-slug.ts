import { headers } from "next/headers";

/**
 * Get the tenant slug from middleware-injected headers.
 * Falls back to TENANT_SLUG env var for local development.
 */
export async function getTenantSlug(): Promise<string | null> {
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug");
  if (slug) return slug;

  // Dev fallback
  return process.env.TENANT_SLUG || null;
}
