-- Treinos was never meant to be part of an Organizador's access — the roles
-- request scoped that role to Dashboard/Torneios/Inscrições/Financeiro only.
-- 20260909000001 gated trainings writes on `is_approved()` (any approved
-- account), which incorrectly let an Organizador manage it too. Tighten it
-- to Super Admin only; public read is untouched.

begin;

drop policy "Approved write trainings" on public.trainings;

create policy "Super admins write trainings" on public.trainings
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

commit;
