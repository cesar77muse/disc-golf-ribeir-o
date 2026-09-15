-- Closes anonymous INSERT on registrations.
--
-- 20260907000000 let anyone insert their own sign-up, which was fine while the
-- form only recorded interest. Now the row is what the Mercado Pago preference
-- is built from, so a client-supplied `price` would be a client-supplied amount
-- to charge. The checkout server function (src/lib/checkout.ts) resolves the
-- price from division_prices and inserts with the service role, which bypasses
-- RLS — so no INSERT policy is needed at all.
--
-- RUN THIS ONLY AFTER the checkout server function is deployed: until then the
-- public form still inserts from the browser and would start failing.

begin;

drop policy "Anyone can register" on public.registrations;

commit;
