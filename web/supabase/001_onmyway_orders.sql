-- OnMyWay · run once in Supabase → SQL Editor (project kxawdsdkarfxzhcrqetw).
-- Additive only: nothing here changes or removes what the web apps already use.
-- The Expo app works before this runs: it drops columns the table doesn't have and
-- carries the same fields as JSON in delivery_otp meanwhile. Run this to get proper
-- columns you can query and to stop using delivery_otp as a sidecar.

alter table public.orders
  add column if not exists requester_reg_no text,          -- who placed it (app users sign in by reg number)
  add column if not exists rider_reg_no     text,          -- who took it
  add column if not exists rider_name       text,
  add column if not exists rider_upi        text,          -- courier's personal UPI, shown to the customer at handover
  add column if not exists rider_phone      text,          -- shown to the customer while the order is live
  add column if not exists delivery_fee     integer,       -- ₹20 regular / ₹30 large, quoted when placed
  add column if not exists pickup_otp       text,          -- the platform's collection code (Amazon etc.)
  add column if not exists driver_phone     text,          -- the platform driver's number, typed in by the customer
  add column if not exists pin_expires_at   timestamptz,   -- delivery_pin is good for 5 minutes
  add column if not exists updated_at       timestamptz not null default now(),
  add column if not exists rating           integer check (rating between 1 and 5),
  add column if not exists report_by        text check (report_by in ('customer', 'courier')),
  add column if not exists report_reason    text,
  add column if not exists report_note      text,
  add column if not exists reported_at      timestamptz;

-- delivery_status vocabulary (shared with the web apps):
--   available → allocated → picked_up → on_the_way → reached → handed_over → delivered
--   plus cancelled, disputed. (pending/PENDING are read as available.)

create index if not exists orders_status_created_idx on public.orders (delivery_status, created_at desc);
create index if not exists orders_requester_idx on public.orders (requester_reg_no);
create index if not exists orders_rider_idx on public.orders (rider_reg_no);

-- Realtime is already on for orders; this is a no-op if so.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
