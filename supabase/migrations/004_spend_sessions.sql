-- Migration 004: spend sessions (reward time usage)

create table if not exists public.spend_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reward_id uuid references public.rewards(id) on delete set null,
  started_at timestamptz not null default now(),
  stopped_at timestamptz null,
  minutes_used int null,        -- set on stop
  week_start text not null      -- YYYY-MM-DD of Monday, for weekly scoping
);

create index if not exists spend_sessions_user_week_idx on public.spend_sessions(user_id, week_start);

alter table public.spend_sessions enable row level security;
create policy "service role full access spend_sessions" on public.spend_sessions for all using (true);

-- Also update rewards to support unlimited type
alter table public.rewards
  add column if not exists unlimited boolean not null default false;
