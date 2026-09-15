-- Adds roles (super_admin / organizador) with an approval gate, plus a
-- per-tournament approval workflow, closing the hole called out in
-- 20260906000000_initial_schema.sql: until now ANY authenticated user (i.e.
-- anyone who self-signs-up at /auth) had full write access to every table.
--
-- Signup stays open, but a brand-new account can only read/write once a
-- Super Admin approves it (public.profiles.status). Tournaments created by an
-- Organizador additionally start out hidden from the public site
-- (approval_status = 'pending') until a Super Admin approves them; a Super
-- Admin's own tournaments are approved immediately.

begin;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row, created automatically on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'organizador' check (role in ('super_admin', 'organizador')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed the first Super Admin from the account already in use. Covers both a
-- pre-existing profile row and an auth.users row created before this
-- migration (the trigger above only fires for new signups).
insert into public.profiles (id, email, role, status)
select id, email, 'super_admin', 'approved'
from auth.users
where email = 'luciasalinashernandez@gmail.com'
on conflict (id) do update set role = 'super_admin', status = 'approved';

-- security definer + stable: safe to call from RLS policies (incl. on
-- profiles itself) without recursing back into RLS.
create function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and status = 'approved'
  );
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin' and status = 'approved'
  );
$$;

alter table public.profiles enable row level security;

create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Super admins read all profiles" on public.profiles
  for select using (public.is_super_admin());
create policy "Super admins update profiles" on public.profiles
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- tournaments — ownership + approval workflow
-- ---------------------------------------------------------------------------
alter table public.tournaments
  add column created_by uuid references auth.users(id),
  add column approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected'));

-- Tournaments that already exist are already live on the public site.
update public.tournaments set approval_status = 'approved';

-- RLS has no column-level granularity, so an Organizador updating their own
-- (pending) tournament could otherwise slip `approval_status: 'approved'`
-- into the same payload. Enforce both fields server-side instead.
create function public.set_tournament_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.approval_status := case when public.is_super_admin() then 'approved' else 'pending' end;
  elsif tg_op = 'UPDATE' then
    new.created_by := old.created_by;
    if new.approval_status is distinct from old.approval_status and not public.is_super_admin() then
      new.approval_status := old.approval_status;
    end if;
  end if;
  return new;
end;
$$;

create trigger tournaments_set_approval
  before insert or update on public.tournaments
  for each row execute function public.set_tournament_approval();

drop policy "Public read tournaments" on public.tournaments;
drop policy "Authenticated write tournaments" on public.tournaments;

create policy "Public read approved tournaments" on public.tournaments
  for select using (approval_status = 'approved');
create policy "Owners and admins read own tournaments" on public.tournaments
  for select using (public.is_approved() and (created_by = auth.uid() or public.is_super_admin()));
create policy "Approved users insert tournaments" on public.tournaments
  for insert to authenticated with check (public.is_approved());
create policy "Owners and admins update tournaments" on public.tournaments
  for update
  using (public.is_approved() and (created_by = auth.uid() or public.is_super_admin()))
  with check (public.is_approved() and (created_by = auth.uid() or public.is_super_admin()));
create policy "Owners and admins delete tournaments" on public.tournaments
  for delete using (public.is_approved() and (created_by = auth.uid() or public.is_super_admin()));

-- tournament_divisions / division_prices: readable when the parent tournament
-- is approved, writable by the parent tournament's owner or a super admin.
drop policy "Public read tournament_divisions" on public.tournament_divisions;
drop policy "Authenticated write tournament_divisions" on public.tournament_divisions;

create policy "Public read divisions of approved tournaments" on public.tournament_divisions
  for select using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_divisions.tournament_id and t.approval_status = 'approved'
    )
  );
create policy "Owners and admins write tournament_divisions" on public.tournament_divisions
  for all to authenticated
  using (
    public.is_approved() and exists (
      select 1 from public.tournaments t
      where t.id = tournament_divisions.tournament_id
        and (t.created_by = auth.uid() or public.is_super_admin())
    )
  )
  with check (
    public.is_approved() and exists (
      select 1 from public.tournaments t
      where t.id = tournament_divisions.tournament_id
        and (t.created_by = auth.uid() or public.is_super_admin())
    )
  );

drop policy "Public read division_prices" on public.division_prices;
drop policy "Authenticated write division_prices" on public.division_prices;

create policy "Public read prices of approved tournaments" on public.division_prices
  for select using (
    exists (
      select 1 from public.tournament_divisions d
      join public.tournaments t on t.id = d.tournament_id
      where d.id = division_prices.division_id and t.approval_status = 'approved'
    )
  );
create policy "Owners and admins write division_prices" on public.division_prices
  for all to authenticated
  using (
    public.is_approved() and exists (
      select 1 from public.tournament_divisions d
      join public.tournaments t on t.id = d.tournament_id
      where d.id = division_prices.division_id
        and (t.created_by = auth.uid() or public.is_super_admin())
    )
  )
  with check (
    public.is_approved() and exists (
      select 1 from public.tournament_divisions d
      join public.tournaments t on t.id = d.tournament_id
      where d.id = division_prices.division_id
        and (t.created_by = auth.uid() or public.is_super_admin())
    )
  );

-- ---------------------------------------------------------------------------
-- Everything else that used to be "any authenticated user can write":
-- gate on account approval only (no per-item approval).
-- ---------------------------------------------------------------------------
drop policy "Authenticated write past_tournaments" on public.past_tournaments;
create policy "Approved write past_tournaments" on public.past_tournaments
  for all to authenticated using (public.is_approved()) with check (public.is_approved());

drop policy "Authenticated write trainings" on public.trainings;
create policy "Approved write trainings" on public.trainings
  for all to authenticated using (public.is_approved()) with check (public.is_approved());

drop policy "Authenticated write partners" on public.partners;
create policy "Approved write partners" on public.partners
  for all to authenticated using (public.is_approved()) with check (public.is_approved());

-- content_blocks and faq were dropped by 20260907000003_drop_static_content.sql
-- and no longer exist, so there's nothing to update their policies for.

drop policy "Authenticated read registrations" on public.registrations;
drop policy "Authenticated update registrations" on public.registrations;
drop policy "Authenticated delete registrations" on public.registrations;
create policy "Approved read registrations" on public.registrations
  for select to authenticated using (public.is_approved());
create policy "Approved update registrations" on public.registrations
  for update to authenticated using (public.is_approved()) with check (public.is_approved());
create policy "Approved delete registrations" on public.registrations
  for delete to authenticated using (public.is_approved());

drop policy "Authenticated upload media" on storage.objects;
drop policy "Authenticated update media" on storage.objects;
drop policy "Authenticated delete media" on storage.objects;
create policy "Approved upload media" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_approved());
create policy "Approved update media" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_approved()) with check (bucket_id = 'media' and public.is_approved());
create policy "Approved delete media" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_approved());

commit;
