-- Migration 005: reward types

alter table public.rewards
  add column if not exists type text not null default 'redeemable'
    check (type in ('redeemable', 'trigger')),
  add column if not exists cost_minutes int null; -- for trigger rewards: how many minutes it costs

-- Existing rewards default to redeemable which is correct
-- cost_minutes null on redeemable = uses full balance
-- cost_minutes set on trigger = deducts that amount on approval
