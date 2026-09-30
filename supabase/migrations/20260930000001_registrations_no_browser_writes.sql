-- Registrations can no longer be updated or deleted from the browser.
--
-- 20260909000003 let an Organizador (for their own tournaments) and a Super
-- Admin UPDATE and DELETE registrations straight from the client. RLS has no
-- column granularity, so an Organizador could set `status = 'confirmed'` or
-- `payment_status = 'approved'` on a sign-up that never paid, or delete a paid
-- one. Payment state is now owned by the server: the Mercado Pago webhook,
-- the return-page reconcile and the Super Admin manual confirmation
-- (src/lib/manual-payment.ts) all write with the service role, which bypasses
-- RLS, and the admin panel only reads registrations.
--
-- With no UPDATE/DELETE policy left, those operations are denied for every
-- client role. SELECT policies are unchanged. If the panel ever needs to edit
-- a registration (e.g. notes), add a server function instead of a policy.

begin;

drop policy "Owners and admins update registrations" on public.registrations;
drop policy "Owners and admins delete registrations" on public.registrations;

commit;
