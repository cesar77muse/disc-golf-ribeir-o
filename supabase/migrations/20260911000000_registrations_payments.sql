-- Mercado Pago (Checkout Pro) payment tracking on registrations.
--
-- `status` stays the organiser-facing state of the sign-up itself
-- (pending / confirmed / cancelled / waitlist); these columns track the money,
-- which moves on its own schedule: a PIX or boleto can stay `pending` for days
-- and a card can be refunded long after the sign-up was confirmed.
--
-- Amounts are snapshotted the same way division_name/price already are, so a
-- later price change cannot rewrite what somebody actually paid.

begin;

alter table public.registrations
  -- Mercado Pago's own payment states, kept verbatim so the webhook can map
  -- 1:1 instead of inventing a vocabulary that drifts from the dashboard.
  add column payment_status text not null default 'pending'
    check (payment_status in (
      'pending', 'in_process', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back'
    )),
  add column mp_preference_id text,
  add column mp_payment_id text,
  add column mp_status_detail text,
  add column payment_method text,
  add column amount_paid numeric(10,2) check (amount_paid is null or amount_paid >= 0),
  add column paid_at timestamptz;

-- The webhook looks rows up by payment id; it can fire several times for the
-- same payment, so the lookup has to be cheap and the id unique.
create unique index registrations_mp_payment_id_idx
  on public.registrations(mp_payment_id)
  where mp_payment_id is not null;

create index registrations_payment_status_idx on public.registrations(payment_status);

commit;
