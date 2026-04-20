export interface User {
  id: string
  name: string
  role: 'admin' | 'member'
  avatar_color: string
  created_at?: string
}

export interface Task {
  id: string
  name: string
  time_value: number
  frequency_per_week: number
  daily_limit: number | null
  category: string | null
  instructions: string | null
  active: boolean
  created_at?: string
}

export interface Completion {
  id: string
  user_id: string
  task_id: string
  completed_at: string
  status: 'pending' | 'approved' | 'rejected'
  actual_duration: number | null
  awarded_minutes: number | null
  note: string | null
  tasks?: Pick<Task, 'id' | 'name' | 'time_value'>
  users?: Pick<User, 'id' | 'name' | 'avatar_color'>
}

export interface Reward {
  id: string
  name: string
  threshold_minutes: number
  unlimited: boolean
  active: boolean
}

export interface RewardClaim {
  id: string
  user_id: string
  reward_id: string
  status: 'pending' | 'approved' | 'declined'
  claimed_at: string
  resolved_at: string | null
  note: string | null
  rewards?: Pick<Reward, 'id' | 'name' | 'threshold_minutes'>
  users?: Pick<User, 'id' | 'name' | 'avatar_color'>
}

export interface SessionUser {
  userId: string
  role: 'admin' | 'member'
  name: string
}

export interface WeeklyTotal {
  user: User
  minutes: number
  completions: number
}

export interface SpendSession {
  id: string
  user_id: string
  reward_id: string | null
  started_at: string
  stopped_at: string | null
  minutes_used: number | null
  week_start: string
  rewards?: Pick<Reward, 'id' | 'name'>
}
