// Data access for tournaments. Maps the snake_case Supabase rows onto the
// Tournament / PastTournament shapes the components already consume, so the
// card and detail components did not have to change when the data moved out
// of src/lib/site-data.ts.
import { supabase } from "@/integrations/supabase/client";
import {
  BUNDLED_PARTNER_LOGOS,
  type PastTournament,
  type Partner,
  type Tournament,
  type TournamentDivision,
} from "@/lib/site-data";
import { fetchPartners, type PartnerRecord } from "@/lib/partners";

const TOURNAMENT_FIELDS = `
  id, slug, title, date, end_date, registration_deadline, registration_deadline_confirmed,
  location, description, image_url, status, prices_approximate, pdga_link,
  archived_at, photos, sponsor_partner_ids, created_by, approval_status,
  tournament_divisions ( name, spots, sort_order, division_prices ( label, price, sort_order ) )
`;

const PAST_TOURNAMENT_FIELDS = `
  slug, title, date, end_date, location, image_url, divisions, photos, sponsor_partner_ids
`;

type DivisionPriceRow = { label: string; price: number; sort_order: number };

type DivisionRow = {
  name: string;
  spots: number | null;
  sort_order: number;
  division_prices: DivisionPriceRow[];
};

type TournamentRow = {
  id: string;
  slug: string;
  title: string;
  date: string;
  end_date: string | null;
  registration_deadline: string;
  registration_deadline_confirmed: boolean;
  location: string;
  description: string;
  image_url: string | null;
  status: string;
  prices_approximate: boolean;
  pdga_link: string | null;
  archived_at: string | null;
  photos: string[];
  sponsor_partner_ids: string[] | null;
  created_by: string | null;
  approval_status: string;
  tournament_divisions: DivisionRow[];
};

type PastTournamentRow = {
  slug: string;
  title: string;
  date: string;
  end_date: string | null;
  location: string;
  image_url: string | null;
  divisions: string[];
  photos: string[];
  sponsor_partner_ids: string[] | null;
};

const STATUSES: readonly string[] = ["open", "closed", "waitlist"];

/** The column is a plain text check constraint, so narrow it before it reaches the UI. */
function toStatus(value: string): Tournament["status"] {
  return STATUSES.includes(value) ? (value as Tournament["status"]) : "closed";
}

const APPROVAL_STATUSES: readonly string[] = ["pending", "approved", "rejected"];

function toApprovalStatus(value: string): NonNullable<Tournament["approvalStatus"]> {
  return APPROVAL_STATUSES.includes(value)
    ? (value as NonNullable<Tournament["approvalStatus"]>)
    : "pending";
}

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) =>
  a.sort_order - b.sort_order;

function toDivision(row: DivisionRow): TournamentDivision {
  const prices = [...row.division_prices].sort(bySortOrder).map((p) => ({
    label: p.label,
    // numeric(10,2) can arrive as a string depending on the driver.
    price: Number(p.price),
  }));
  return {
    name: row.name,
    prices,
    ...(row.spots !== null ? { spots: row.spots } : {}),
  };
}

/** Explicit selection wins; otherwise fall back to whichever partners are flagged as default sponsors. */
function resolveSponsors(
  sponsorPartnerIds: string[] | null,
  allPartners: PartnerRecord[],
): Partner[] {
  const chosen =
    sponsorPartnerIds && sponsorPartnerIds.length > 0
      ? allPartners.filter((p) => sponsorPartnerIds.includes(p.id))
      : allPartners.filter((p) => p.isDefaultSponsor);
  return [...chosen]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      name: p.name,
      fullName: p.fullName,
      logo: p.logoUrl ?? BUNDLED_PARTNER_LOGOS[p.slug] ?? "",
    }));
}

// Optional keys are spread in conditionally: tsconfig sets
// exactOptionalPropertyTypes, so `endDate: undefined` is not assignable.
function toTournament(row: TournamentRow, allPartners: PartnerRecord[]): Tournament {
  const sponsors = resolveSponsors(row.sponsor_partner_ids, allPartners);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.date,
    registrationDeadline: row.registration_deadline,
    registrationDeadlineConfirmed: row.registration_deadline_confirmed,
    location: row.location,
    description: row.description,
    image: row.image_url ?? "",
    divisions: [...row.tournament_divisions].sort(bySortOrder).map(toDivision),
    status: toStatus(row.status),
    ...(row.end_date ? { endDate: row.end_date } : {}),
    ...(row.prices_approximate ? { pricesApproximate: true } : {}),
    ...(row.pdga_link ? { pdgaLink: row.pdga_link } : {}),
    ...(row.archived_at ? { archivedAt: row.archived_at } : {}),
    ...(row.photos.length > 0 ? { photos: row.photos } : {}),
    ...(sponsors.length > 0 ? { sponsors } : {}),
    ...(row.sponsor_partner_ids && row.sponsor_partner_ids.length > 0
      ? { sponsorPartnerIds: row.sponsor_partner_ids }
      : {}),
    approvalStatus: toApprovalStatus(row.approval_status),
    ...(row.created_by ? { createdBy: row.created_by } : {}),
  };
}

function toPastTournament(row: PastTournamentRow, allPartners: PartnerRecord[]): PastTournament {
  const sponsors = resolveSponsors(row.sponsor_partner_ids, allPartners);
  return {
    slug: row.slug,
    title: row.title,
    date: row.date,
    location: row.location,
    image: row.image_url ?? "",
    ...(row.end_date ? { endDate: row.end_date } : {}),
    ...(row.divisions.length > 0 ? { divisions: row.divisions } : {}),
    ...(row.photos.length > 0 ? { photos: row.photos } : {}),
    ...(sponsors.length > 0 ? { sponsors } : {}),
  };
}

function fail(what: string, message: string): never {
  throw new Error(`Não foi possível carregar ${what}: ${message}`);
}

/**
 * For the public site only. Explicitly restricted to approved tournaments —
 * without this filter, an Organizador browsing the site while logged in
 * would also see their own not-yet-approved tournaments here, since RLS lets
 * an owner read their own rows regardless of status. Admin screens should use
 * `fetchTournamentsForAdmin` instead.
 */
export async function fetchTournaments(): Promise<Tournament[]> {
  const [{ data, error }, allPartners] = await Promise.all([
    supabase
      .from("tournaments")
      .select(TOURNAMENT_FIELDS)
      .eq("approval_status", "approved")
      .order("date", { ascending: true }),
    fetchPartners(),
  ]);

  if (error) fail("os torneios", error.message);
  return (data as unknown as TournamentRow[]).map((row) => toTournament(row, allPartners));
}

/**
 * For the admin panel: a Super Admin manages every tournament, an Organizador
 * only their own (any approval status) — never other organisers' tournaments,
 * approved or not. RLS would also let an Organizador's query return every
 * approved tournament site-wide (the public-read policy has no ownership
 * check), so the `created_by` filter here is what actually narrows it down,
 * not just RLS.
 */
export async function fetchTournamentsForAdmin(
  profile: { id: string; role: "super_admin" | "organizador" } | null,
): Promise<Tournament[]> {
  if (!profile) return [];

  let query = supabase.from("tournaments").select(TOURNAMENT_FIELDS).order("date", {
    ascending: true,
  });
  if (profile.role !== "super_admin") {
    query = query.eq("created_by", profile.id);
  }

  const [{ data, error }, allPartners] = await Promise.all([query, fetchPartners()]);
  if (error) fail("os torneios", error.message);
  return (data as unknown as TournamentRow[]).map((row) => toTournament(row, allPartners));
}

export async function fetchTournamentBySlug(slug: string): Promise<Tournament | null> {
  const [{ data, error }, allPartners] = await Promise.all([
    supabase.from("tournaments").select(TOURNAMENT_FIELDS).eq("slug", slug).maybeSingle(),
    fetchPartners(),
  ]);

  if (error) fail("o torneio", error.message);
  return data ? toTournament(data as unknown as TournamentRow, allPartners) : null;
}

/** The next tournament on or after today — used by the home page hero. */
export async function fetchNextTournament(): Promise<Tournament | null> {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data, error }, allPartners] = await Promise.all([
    supabase
      .from("tournaments")
      .select(TOURNAMENT_FIELDS)
      .eq("approval_status", "approved")
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    fetchPartners(),
  ]);

  if (error) fail("o próximo torneio", error.message);
  return data ? toTournament(data as unknown as TournamentRow, allPartners) : null;
}

export async function fetchPastTournaments(): Promise<PastTournament[]> {
  const [{ data, error }, allPartners] = await Promise.all([
    supabase
      .from("past_tournaments")
      .select(PAST_TOURNAMENT_FIELDS)
      .order("date", { ascending: false }),
    fetchPartners(),
  ]);

  if (error) fail("os torneios realizados", error.message);
  return (data as unknown as PastTournamentRow[]).map((row) => toPastTournament(row, allPartners));
}

// ---------------------------------------------------------------------------
// Admin CRUD — general tournament fields only. Divisions/prices are still
// managed directly in Supabase until that editor is built.
// ---------------------------------------------------------------------------

export type TournamentGeneralInput = {
  title: string;
  date: string;
  endDate?: string;
  registrationDeadline: string;
  registrationDeadlineConfirmed: boolean;
  location: string;
  description: string;
  imageUrl?: string;
  status: Tournament["status"];
  pricesApproximate?: boolean;
  pdgaLink?: string;
  sponsorPartnerIds?: string[];
};

function toTournamentRow(input: TournamentGeneralInput) {
  return {
    title: input.title,
    date: input.date,
    end_date: input.endDate ?? null,
    registration_deadline: input.registrationDeadline,
    registration_deadline_confirmed: input.registrationDeadlineConfirmed,
    location: input.location,
    description: input.description,
    image_url: input.imageUrl ?? null,
    status: input.status,
    prices_approximate: input.pricesApproximate ?? false,
    pdga_link: input.pdgaLink ?? null,
    sponsor_partner_ids: input.sponsorPartnerIds ?? null,
  };
}

/** ascii-fold + kebab-case; used to derive the URL slug from the title when creating a tournament. */
export function slugifyTournamentTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createTournament(
  slug: string,
  input: TournamentGeneralInput,
): Promise<Tournament> {
  const { error } = await supabase.from("tournaments").insert({ slug, ...toTournamentRow(input) });
  if (error) fail("o torneio", error.message);
  const created = await fetchTournamentBySlug(slug);
  if (!created) fail("o torneio", "não encontrado depois de criado");
  return created;
}

export async function updateTournament(
  slug: string,
  input: TournamentGeneralInput,
): Promise<Tournament> {
  const { error } = await supabase
    .from("tournaments")
    .update(toTournamentRow(input))
    .eq("slug", slug);
  if (error) fail("o torneio", error.message);
  const updated = await fetchTournamentBySlug(slug);
  if (!updated) fail("o torneio", "não encontrado depois de atualizado");
  return updated;
}

/** Cascades: deletes the tournament's divisions, prices AND registrations (on delete cascade). */
export async function deleteTournament(slug: string): Promise<void> {
  const { error } = await supabase.from("tournaments").delete().eq("slug", slug);
  if (error) fail("o torneio", error.message);
}

export async function setTournamentArchived(slug: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from("tournaments")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("slug", slug);
  if (error) fail("o torneio", error.message);
}

// ---------------------------------------------------------------------------
// Approval workflow — a tournament an Organizador creates starts out hidden
// from the public site (approval_status 'pending') until a Super Admin
// approves it here; a Super Admin's own tournaments are approved on creation.
// See the `tournaments_set_approval` trigger for the server-side guard.
// ---------------------------------------------------------------------------

/** Every pending tournament, regardless of who created it — only a Super Admin's RLS lets this return other people's rows. */
export async function fetchPendingTournaments(): Promise<Tournament[]> {
  const [{ data, error }, allPartners] = await Promise.all([
    supabase
      .from("tournaments")
      .select(TOURNAMENT_FIELDS)
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true }),
    fetchPartners(),
  ]);

  if (error) fail("os torneios pendentes", error.message);
  return (data as unknown as TournamentRow[]).map((row) => toTournament(row, allPartners));
}

export async function setTournamentApprovalStatus(
  id: string,
  status: "approved" | "rejected",
): Promise<void> {
  const { error } = await supabase
    .from("tournaments")
    .update({ approval_status: status })
    .eq("id", id);
  if (error) fail("a aprovação do torneio", error.message);
}

// ---------------------------------------------------------------------------
// Storage — tournament logo + photo gallery, both in the shared `media` bucket
// (public, 10 MB/file cap enforced server-side — see the storage migration).
// ---------------------------------------------------------------------------

export const MAX_TOURNAMENT_IMAGE_BYTES = 10 * 1024 * 1024;

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/").pop() ?? "jpg";
}

async function uploadTournamentMedia(slug: string, file: File, folder: string): Promise<string> {
  if (file.size > MAX_TOURNAMENT_IMAGE_BYTES) {
    throw new Error(`A imagem "${file.name}" passa de 10 MB.`);
  }
  const path = `tournaments/${slug}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension(file)}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) fail("a imagem", error.message);
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export async function uploadTournamentLogo(slug: string, file: File): Promise<string> {
  return uploadTournamentMedia(slug, file, "logo");
}

export async function addTournamentPhotos(slug: string, files: File[]): Promise<string[]> {
  const uploaded = await Promise.all(
    files.map((file) => uploadTournamentMedia(slug, file, "gallery")),
  );
  const current = await fetchTournamentBySlug(slug);
  const photos = [...(current?.photos ?? []), ...uploaded];
  const { error } = await supabase.from("tournaments").update({ photos }).eq("slug", slug);
  if (error) fail("a galeria", error.message);
  return photos;
}

export async function removeTournamentPhoto(slug: string, photoUrl: string): Promise<string[]> {
  const current = await fetchTournamentBySlug(slug);
  const photos = (current?.photos ?? []).filter((p) => p !== photoUrl);
  const { error } = await supabase.from("tournaments").update({ photos }).eq("slug", slug);
  if (error) fail("a galeria", error.message);

  const marker = "/object/public/media/";
  const markerIndex = photoUrl.indexOf(marker);
  if (markerIndex !== -1) {
    await supabase.storage.from("media").remove([photoUrl.slice(markerIndex + marker.length)]);
  }
  return photos;
}

// ---------------------------------------------------------------------------
// Divisions & prices — categories are a fixed set (not editable from the
// admin form yet), only their prices are. New tournaments start from this
// template so the organiser just has to fill in values.
// ---------------------------------------------------------------------------

export const DEFAULT_TOURNAMENT_DIVISIONS: { name: string; priceLabels: string[] }[] = [
  { name: "MA1", priceLabels: ["Kit Disco", "Kit Basico"] },
  { name: "MA40", priceLabels: ["Kit Disco", "Kit Basico"] },
  { name: "MA2", priceLabels: ["Kit Disco", "Kit Basico"] },
  { name: "FA1", priceLabels: ["Kit Disco", "Kit Basico"] },
];

export type DivisionPricesInput = {
  name: string;
  prices: { label: string; price: number }[];
};

/** Replaces every division/price row for a tournament — simplest way to keep them in sync with the form. */
export async function saveTournamentDivisions(
  tournamentId: string,
  divisions: DivisionPricesInput[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("tournament_divisions")
    .delete()
    .eq("tournament_id", tournamentId);
  if (deleteError) fail("as divisões", deleteError.message);

  for (const [index, division] of divisions.entries()) {
    const { data: divisionRow, error: divisionError } = await supabase
      .from("tournament_divisions")
      .insert({ tournament_id: tournamentId, name: division.name, sort_order: index })
      .select("id")
      .single();
    if (divisionError) fail("as divisões", divisionError.message);

    const prices = division.prices.map((p, priceIndex) => ({
      division_id: divisionRow.id,
      label: p.label,
      price: p.price,
      sort_order: priceIndex,
    }));
    if (prices.length === 0) continue;
    const { error: priceError } = await supabase.from("division_prices").insert(prices);
    if (priceError) fail("os preços", priceError.message);
  }
}
