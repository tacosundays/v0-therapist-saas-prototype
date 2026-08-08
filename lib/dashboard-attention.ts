export type AttentionSignals = {
  overdueHomeworkCount: number
  moodChange: number | null
  latestMood: number | null
  latestAnxiety: number | null
  latestStress: number | null
  daysSinceCheckIn: number | null
  daysUntilSession: number | null
}
export type AttentionResult = {
  score: number
  reasons: string[]
  significantMoodAlert: boolean
}

const DAY = 24 * 60 * 60 * 1000

export function daysBetween(later: Date, earlierIso: string | null | undefined) {
  if (!earlierIso) return null
  const earlier = new Date(earlierIso)
  if (Number.isNaN(earlier.getTime())) return null
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / DAY))
}

export function scoreClientAttention(signals: AttentionSignals): AttentionResult {
  let score = 0
  const reasons: string[] = []

  if (signals.overdueHomeworkCount > 0) {
    score += Math.min(50, signals.overdueHomeworkCount * 25)
    reasons.push(`${signals.overdueHomeworkCount} overdue assignment${signals.overdueHomeworkCount === 1 ? "" : "s"}`)
  }

  const worseningMood = signals.moodChange !== null && signals.moodChange <= -2
  const acuteMood = signals.latestMood !== null && signals.latestMood <= 3
  const elevatedAnxiety = signals.latestAnxiety !== null && signals.latestAnxiety >= 8
  const elevatedStress = signals.latestStress !== null && signals.latestStress >= 8
  const significantMoodAlert = worseningMood || acuteMood || elevatedAnxiety || elevatedStress

  if (worseningMood) {
    score += signals.moodChange! <= -3 ? 40 : 30
    reasons.push(`Mood declined ${Math.abs(signals.moodChange!)} points`)
  } else if (acuteMood) {
    score += 35
    reasons.push(`Mood is ${signals.latestMood}/10`)
  } else if (elevatedAnxiety || elevatedStress) {
    score += 25
    reasons.push(elevatedAnxiety ? "Anxiety is elevated" : "Stress is elevated")
  }

  if (signals.daysSinceCheckIn === null || signals.daysSinceCheckIn >= 14) {
    score += 20
    reasons.push(signals.daysSinceCheckIn === null ? "No check-ins yet" : `No check-in in ${signals.daysSinceCheckIn} days`)
  } else if (signals.daysSinceCheckIn >= 7) {
    score += 10
    reasons.push(`Last check-in ${signals.daysSinceCheckIn} days ago`)
  }

  if (signals.daysUntilSession !== null && signals.daysUntilSession >= 0 && signals.daysUntilSession <= 1) {
    score += signals.daysUntilSession === 0 ? 25 : 15
    reasons.push(signals.daysUntilSession === 0 ? "Session today" : "Session tomorrow")
  }

  return {
    score: Math.min(100, score),
    reasons,
    significantMoodAlert,
  }
}
