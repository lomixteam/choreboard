-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Users (family members)
create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pin_hash text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  avatar_color text not null default '#6b8f71',
  created_at timestamptz default now()
);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  time_value int not null check (time_value > 0),  -- minutes
  frequency_per_week int not null default 1,
  instructions text,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Completions
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completed_at timestamptz not null default now()
);

-- Rewards
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  threshold_minutes int not null check (threshold_minutes > 0),
  active boolean not null default true
);

-- Indexes
create index completions_user_id_idx on public.completions(user_id);
create index completions_task_id_idx on public.completions(task_id);
create index completions_completed_at_idx on public.completions(completed_at);

-- RLS (Row Level Security) - disable for local simplicity, enable if needed
alter table public.users enable row level security;
alter table public.tasks enable row level security;
alter table public.completions enable row level security;
alter table public.rewards enable row level security;

-- Allow all via service role (our API routes use service role key)
create policy "service role full access users" on public.users for all using (true);
create policy "service role full access tasks" on public.tasks for all using (true);
create policy "service role full access completions" on public.completions for all using (true);
create policy "service role full access rewards" on public.rewards for all using (true);

-- Seed: default tasks
insert into public.tasks (name, time_value, frequency_per_week, instructions) values
  ('Unload dishwasher', 10, 7, 'Check dishes are dry before putting away. Glasses go on the top shelf, plates in the cupboard below the counter. Cutlery in the drawer next to the sink.'),
  ('Load dishwasher', 10, 7, 'Scrape food off plates first. Glasses and cups on top rack. Pots and pans on bottom. Add a dishwasher tablet from under the sink. Set to Eco mode.'),
  ('Unload washing machine', 10, 3, 'Check every item is out, including socks stuck to the drum. Hang clothes on the drying rack — do not leave in machine or they will smell.'),
  ('Load washing machine', 10, 3, 'Separate whites from colours. Use one cap of liquid detergent in the drawer. Set to 40°C for normal clothes, 30°C for delicates.'),
  ('Clean room', 20, 2, 'Pick up everything from the floor first. Then make the bed. Then wipe the desk. Vacuum last.'),
  ('Practice guitar', 20, 5, 'Warm up with scales for 5 minutes. Then work on your current song. Use the metronome app on the tablet.'),
  ('Practice piano', 20, 5, 'Start with Hanon exercises, hands separately. Then work on your piece hands together slowly before up to speed.');

-- Seed: default rewards
insert into public.rewards (name, threshold_minutes) values
  ('30 min TV', 30),
  ('1 hour Minecraft', 60),
  ('Board game night pick', 90),
  ('Movie night pick', 120);
