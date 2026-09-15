// Data access for the shared `partners` catalog — the 5 default tournament
// sponsors plus any one-off partner an organiser adds for a specific
// tournament (those stay scoped to that tournament; see
// TournamentFormDialog's `visiblePartners` logic).
import { supabase } from "@/integrations/supabase/client";
import { BUNDLED_PARTNER_LOGOS } from "@/lib/site-data";

export type PartnerRecord = {
  id: string;
  slug: string;
  name: string;
  fullName: string;
  logoUrl: string | null;
  isDefaultSponsor: boolean;
  sortOrder: number;
};

type PartnerRow = {
  id: string;
  slug: string;
  name: string;
  full_name: string;
  logo_url: string | null;
  is_default_sponsor: boolean;
  sort_order: number;
};

const PARTNER_FIELDS = "id, slug, name, full_name, logo_url, is_default_sponsor, sort_order";

function toPartnerRecord(row: PartnerRow): PartnerRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    fullName: row.full_name,
    logoUrl: row.logo_url,
    isDefaultSponsor: row.is_default_sponsor,
    sortOrder: row.sort_order,
  };
}

function fail(what: string, message: string): never {
  throw new Error(`Não foi possível carregar ${what}: ${message}`);
}

export async function fetchPartners(): Promise<PartnerRecord[]> {
  const { data, error } = await supabase
    .from("partners")
    .select(PARTNER_FIELDS)
    .order("sort_order", { ascending: true });
  if (error) fail("os parceiros", error.message);
  return (data as unknown as PartnerRow[]).map(toPartnerRecord);
}

/**
 * One-time backfill: the 5 seeded default partners ship with `logo_url`
 * null (their logos were still bundled assets). The first time an
 * authenticated admin opens the sponsor picker, upload the bundled PNGs to
 * Storage and patch the rows — a no-op once that has happened.
 */
export async function ensureDefaultPartnerLogos(
  partners: PartnerRecord[],
): Promise<PartnerRecord[]> {
  const patched = new Map<string, string>();

  for (const partner of partners) {
    const bundledUrl = BUNDLED_PARTNER_LOGOS[partner.slug];
    if (partner.logoUrl || !bundledUrl) continue;
    try {
      const blob = await fetch(bundledUrl).then((r) => r.blob());
      const path = `partners/${partner.slug}.png`;
      const { error: uploadError } = await supabase.storage.from("media").upload(path, blob);
      const alreadyExists = uploadError && /already exists|duplicate/i.test(uploadError.message);
      if (uploadError && !alreadyExists) continue;

      const logoUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
      const { error: updateError } = await supabase
        .from("partners")
        .update({ logo_url: logoUrl })
        .eq("id", partner.id);
      if (updateError) continue;

      patched.set(partner.id, logoUrl);
    } catch {
      // Best-effort: the bundled asset already renders fine as a fallback.
    }
  }

  if (patched.size === 0) return partners;
  return partners.map((p) =>
    patched.has(p.id) ? { ...p, logoUrl: patched.get(p.id) ?? null } : p,
  );
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Adds a one-off partner. It is never marked as a default sponsor, so it
 * only ever appears as an option on the tournament(s) it gets attached to —
 * new tournaments keep showing just the 5 defaults.
 */
export async function createPartner(
  name: string,
  logoFile: File,
  sortOrder: number,
): Promise<PartnerRecord> {
  const slug = `${slugify(name)}-${Date.now().toString(36)}`;
  const ext = logoFile.name.split(".").pop()?.toLowerCase() || "png";
  const path = `partners/${slug}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("media").upload(path, logoFile);
  if (uploadError) fail("o logo do parceiro", uploadError.message);
  const logoUrl = supabase.storage.from("media").getPublicUrl(path).data.publicUrl;

  const { data, error } = await supabase
    .from("partners")
    .insert({
      slug,
      name,
      full_name: name,
      logo_url: logoUrl,
      is_partner: true,
      is_default_sponsor: false,
      sort_order: sortOrder,
    })
    .select(PARTNER_FIELDS)
    .single();
  if (error) fail("o parceiro", error.message);
  return toPartnerRecord(data as unknown as PartnerRow);
}

/** Only meant for one-off partners (never call this on a default sponsor). */
export async function deletePartner(id: string, logoUrl: string | null): Promise<void> {
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) fail("o parceiro", error.message);

  if (!logoUrl) return;
  const marker = "/object/public/media/";
  const markerIndex = logoUrl.indexOf(marker);
  if (markerIndex !== -1) {
    await supabase.storage.from("media").remove([logoUrl.slice(markerIndex + marker.length)]);
  }
}
