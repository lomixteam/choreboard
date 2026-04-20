-- Migration 003: notes, awarded_minutes, reward claims

-- Add note and awarded_minutes to completions
alter table public.completions
  add column if not exists note text null,
  add column if not exists awarded_minutes int null;
-- awarded_minutes: null = use task's time_value, set = use this value

-- Reward claims table
create table if not exists public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  claimed_at timestamptz not null default now(),
  resolved_at timestamptz null,
  note text null
);

create index if not exists reward_claims_user_id_idx on public.reward_claims(user_id);
create index if not exists reward_claims_status_idx on public.reward_claims(status);

-- RLS
alter table public.reward_claims enable row level security;
create policy "service role full access reward_claims" on public.reward_claims for all using (true);

-- Add category to tasks
alter table public.tasks
  add column if not exists category text null;

-- Seed default categories on existing tasks
update public.tasks set category = 'Cleaning' where name in ('Clean room');
update public.tasks set category = 'Kitchen' where name in ('Unload dishwasher', 'Load dishwasher');
update public.tasks set category = 'Laundry' where name in ('Unload washing machine', 'Load washing machine');
update public.tasks set category = 'Music' where name in ('Practice guitar', 'Practice piano');
