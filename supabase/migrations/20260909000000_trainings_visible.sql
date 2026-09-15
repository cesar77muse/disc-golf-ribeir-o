-- Lets organisers hide a training from the public site without deleting it
-- from the admin panel (e.g. a slot that's paused indefinitely).

begin;

alter table public.trainings
  add column visible boolean not null default true;

commit;
