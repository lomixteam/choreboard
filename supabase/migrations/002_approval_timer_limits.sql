-- Migration 002: approval, timer, daily limits

-- Add status and actual_duration to completions
alter table public.completions
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists actual_duration int null; -- seconds, from timer

-- Add daily_limit to tasks (null = unlimited)
alter table public.tasks
  add column if not exists daily_limit int null;

-- Update daily limits on existing seeded tasks
update public.tasks set daily_limit = 1 where name = 'Clean room';
update public.tasks set daily_limit = 3 where name in (
  'Unload washing machine', 'Load washing machine'
);
update public.tasks set daily_limit = 2 where name in (
  'Unload dishwasher', 'Load dishwasher'
);
-- Guitar/piano: once per day makes sense
update public.tasks set daily_limit = 1 where name in (
  'Practice guitar', 'Practice piano'
);

-- Index for approval queries
create index if not exists completions_status_idx on public.completions(status);
create index if not exists completions_user_task_date_idx
  on public.completions(user_id, task_id, completed_at);
