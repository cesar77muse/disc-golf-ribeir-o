-- Manual payment confirmation by a Super Admin.
--
-- Some players pay the organiser directly (PIX outside the site) after the
-- Mercado Pago checkout failed for them. `payment_status = 'manual'` keeps those
-- apart from money Mercado Pago actually captured, and the three columns below
-- record who confirmed it and why.
--
-- APPLY THIS BEFORE deploying the code that reads/writes these columns: the
-- admin registrations list selects them.

begin;

alter table public.registrations
  drop constraint registrations_payment_status_check;

alter table public.registrations
  add constraint registrations_payment_status_check
    check (payment_status in (
      'pending', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back',
      'manual'
    )),
  add column manual_confirmed_by uuid references auth.users(id) on delete set null,
  add column manual_confirmed_at timestamptz,
  add column manual_note text;

commit;
