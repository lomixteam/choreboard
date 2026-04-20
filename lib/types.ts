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
  actual_duration: number | null  // seconds
  tasks?: Pick<Task, 'id' | 'name' | 'time_value'>
  users?: Pick<User, 'id' | 'name' | 'avatar_color'>
}

export interface Reward {
  id: string
  name: string
  threshold_minutes: number
  active: boolean
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

export interface HistoryEntry {
  week_start: string
  user_id: string
  total_minutes: number
  task_count: number
}
