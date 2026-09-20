-- OnMyWay · run once in Supabase → SQL Editor (project kxawdsdkarfxzhcrqetw).
-- Additive only. The table already has fare, pickup_otp, pin_expiry, rating, report,
-- rider_name, rider_upi and completed_at — the app uses those as-is. These are the
-- five it still lacks; until they exist the app carries them as JSON in delivery_otp.

alter table public.orders
  add column if not exists requester_reg_no text,          -- who placed it (app users sign in by reg number)
  add column if not exists rider_reg_no     text,          -- who took it (rider_name/rider_upi already exist)
  add column if not exists rider_phone      text,          -- shown to the customer while the order is live
  add column if not exists driver_phone     text,          -- the platform driver's number, typed in by the customer
  add column if not exists updated_at       timestamptz not null default now();

-- delivery_status vocabulary (shared with the web apps):
--   available → allocated → picked_up → on_the_way → reached → handed_over → delivered
--   plus cancelled, disputed. (pending/PENDING are read as available.)
-- report is JSON text: {"by":"customer|courier","reason":"…","note":"…","at":<ms>}

create index if not exists orders_status_created_idx on public.orders (delivery_status, created_at desc);
create index if not exists orders_requester_idx on public.orders (requester_reg_no);
create index if not exists orders_rider_idx on public.orders (rider_reg_no);
