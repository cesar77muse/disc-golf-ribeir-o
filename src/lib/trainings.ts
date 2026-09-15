// Data access for trainings. Same approach as src/lib/tournaments.ts: map the
// Supabase rows onto the Training shape the pages already consume, so the
// markup did not have to change when the data left src/lib/site-data.ts.
import { supabase } from "@/integrations/supabase/client";
import type { Training } from "@/lib/site-data";

const TRAINING_FIELDS = `slug, title, day, time, location, level, description, status, confirmed, visible`;

type TrainingRow = {
  slug: string;
  title: string;
  day: string;
  time: string;
  location: string;
  level: string;
  description: string;
  status: string;
  confirmed: boolean;
  visible: boolean;
};

const STATUSES: readonly string[] = ["active", "suspended"];

/** The column is plain text behind a check constraint, so narrow it here. */
function toStatus(value: string): Training["status"] {
  return STATUSES.includes(value) ? (value as Training["status"]) : "suspended";
}

function toTraining(row: TrainingRow): Training {
  return {
    // The hardcoded data used the slug ("treino-semanal") as `id`, and the
    // pages use it as the React key, so keep that mapping.
    id: row.slug,
    title: row.title,
    day: row.day,
    time: row.time,
    location: row.location,
    level: row.level,
    description: row.description,
    status: toStatus(row.status),
    confirmed: row.confirmed,
    visible: row.visible,
  };
}

function fail(what: string, message: string): never {
  throw new Error(`Não foi possível carregar ${what}: ${message}`);
}

/** Everything, including hidden/suspended trainings — used by the admin panel. */
export async function fetchTrainings(): Promise<Training[]> {
  // No sort_order column yet — creation order is stable and there is one row.
  const { data, error } = await supabase
    .from("trainings")
    .select(TRAINING_FIELDS)
    .order("created_at", { ascending: true });

  if (error) fail("os treinos", error.message);
  return (data as unknown as TrainingRow[]).map(toTraining);
}

/** Only what should show on the public site. */
export async function fetchVisibleTrainings(): Promise<Training[]> {
  const { data, error } = await supabase
    .from("trainings")
    .select(TRAINING_FIELDS)
    .eq("visible", true)
    .order("created_at", { ascending: true });

  if (error) fail("os treinos", error.message);
  return (data as unknown as TrainingRow[]).map(toTraining);
}

export async function fetchTrainingBySlug(slug: string): Promise<Training | null> {
  const { data, error } = await supabase
    .from("trainings")
    .select(TRAINING_FIELDS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) fail("o treino", error.message);
  return data ? toTraining(data as unknown as TrainingRow) : null;
}

/** The first active, visible training — used by the home page schedule callout. */
export async function fetchOpenTraining(): Promise<Training | null> {
  const { data, error } = await supabase
    .from("trainings")
    .select(TRAINING_FIELDS)
    .eq("status", "active")
    .eq("visible", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) fail("o treino aberto", error.message);
  return data ? toTraining(data as unknown as TrainingRow) : null;
}

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

export type TrainingGeneralInput = {
  title: string;
  day: string;
  time: string;
  location: string;
  level: string;
  description: string;
  status: Training["status"];
  confirmed: boolean;
  visible: boolean;
};

function toTrainingRow(input: TrainingGeneralInput) {
  return {
    title: input.title,
    day: input.day,
    time: input.time,
    location: input.location,
    level: input.level,
    description: input.description,
    status: input.status,
    confirmed: input.confirmed,
    visible: input.visible,
  };
}

/** ascii-fold + kebab-case; used to derive the URL slug from the title when creating a training. */
export function slugifyTrainingTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createTraining(slug: string, input: TrainingGeneralInput): Promise<Training> {
  const { error } = await supabase.from("trainings").insert({ slug, ...toTrainingRow(input) });
  if (error) fail("o treino", error.message);
  const created = await fetchTrainingBySlug(slug);
  if (!created) fail("o treino", "não encontrado depois de criado");
  return created;
}

export async function updateTraining(slug: string, input: TrainingGeneralInput): Promise<Training> {
  const { error } = await supabase.from("trainings").update(toTrainingRow(input)).eq("slug", slug);
  if (error) fail("o treino", error.message);
  const updated = await fetchTrainingBySlug(slug);
  if (!updated) fail("o treino", "não encontrado depois de atualizado");
  return updated;
}

export async function deleteTraining(slug: string): Promise<void> {
  const { error } = await supabase.from("trainings").delete().eq("slug", slug);
  if (error) fail("o treino", error.message);
}
