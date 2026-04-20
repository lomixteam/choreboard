// Returns Monday 00:00:00 of current week (local time, ISO string)
export function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}

export function getWeekEnd(): string {
  const start = new Date(getWeekStart())
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return end.toISOString()
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
