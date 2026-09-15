// Data access for `profiles` — one row per auth.users row, created by the
// `on_auth_user_created` trigger (see the roles migration). Holds the role
// and approval gate that decide whether a logged-in account gets into the
// admin panel at all, and whether it's a Super Admin or an Organizador.
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "super_admin" | "organizador";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type Profile = {
  id: string;
  email: string;
  role: UserRole;
  status: ApprovalStatus;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

const PROFILE_FIELDS = "id, email, role, status, created_at";

function toRole(value: string): UserRole {
  return value === "super_admin" ? "super_admin" : "organizador";
}

function toStatus(value: string): ApprovalStatus {
  return value === "approved" || value === "rejected" ? value : "pending";
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    role: toRole(row.role),
    status: toStatus(row.status),
    createdAt: row.created_at,
  };
}

function fail(what: string, message: string): never {
  throw new Error(`Não foi possível carregar ${what}: ${message}`);
}

/** The logged-in user's own profile — drives the admin panel's approval gate and role badge. */
export async function fetchCurrentProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle();
  if (error) fail("seu perfil", error.message);
  return data ? toProfile(data as unknown as ProfileRow) : null;
}

/** Every account in the system. RLS only lets a Super Admin see rows other than their own. */
export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .order("created_at", { ascending: true });
  if (error) fail("os usuários", error.message);
  return (data as unknown as ProfileRow[]).map(toProfile);
}

export async function updateProfileStatus(id: string, status: ApprovalStatus): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
  if (error) fail("o status do usuário", error.message);
}

export async function updateProfileRole(id: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) fail("o papel do usuário", error.message);
}
