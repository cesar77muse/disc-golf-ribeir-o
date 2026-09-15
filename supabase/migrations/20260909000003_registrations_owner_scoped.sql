-- An Organizador should only see/manage registrations for tournaments they
-- created — same principle as 20260909000001's tournament ownership, applied
-- here because 20260909000001 only gated registrations on `is_approved()`,
-- letting any approved Organizador read/update/delete every registration
-- (including personal data: name, email, phone) for every tournament, not
-- just their own. Super Admin keeps full access.

begin;

drop policy "Approved read registrations" on public.registrations;
drop policy "Approved update registrations" on public.registrations;
drop policy "Approved delete registrations" on public.registrations;

create policy "Owners and admins read registrations" on public.registrations
  for select to authenticated using (
    public.is_approved() and (
      public.is_super_admin() or exists (
        select 1 from public.tournaments t
        where t.id = registrations.tournament_id and t.created_by = auth.uid()
      )
    )
  );

create policy "Owners and admins update registrations" on public.registrations
  for update to authenticated
  using (
    public.is_approved() and (
      public.is_super_admin() or exists (
        select 1 from public.tournaments t
        where t.id = registrations.tournament_id and t.created_by = auth.uid()
      )
    )
  )
  with check (
    public.is_approved() and (
      public.is_super_admin() or exists (
        select 1 from public.tournaments t
        where t.id = registrations.tournament_id and t.created_by = auth.uid()
      )
    )
  );

create policy "Owners and admins delete registrations" on public.registrations
  for delete to authenticated using (
    public.is_approved() and (
      public.is_super_admin() or exists (
        select 1 from public.tournaments t
        where t.id = registrations.tournament_id and t.created_by = auth.uid()
      )
    )
  );

commit;
