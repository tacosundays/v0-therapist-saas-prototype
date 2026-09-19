export interface SessionSummarySections {
  clientOverview: string
  progressSinceLastSession: string
  moodTrends: string
  reflectionThemes: string
  homeworkProgress: string
  suggestedDiscussionTopics: string[]
  suggestedInterventions: Array<{ name: string; rationale: string }>
  homeworkRecommendation: { title: string; rationale: string } | null
}

export interface SessionSummaryEvidence {
  assignments: number
  worksheetAssignments: number
  worksheetResponses: number
  reflections: number
  moodCheckIns: number
  couples: number
  coupleCheckIns: number
  progressNotes: number
  sessionPrepNotes: number
}

const noData = "The current record does not contain enough information for this section."

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function normalizeSessionSummary(
  rawSummary: unknown,
  evidence: SessionSummaryEvidence,
): SessionSummarySections {
  const value = rawSummary && typeof rawSummary === "object" ? rawSummary as Partial<SessionSummarySections> : {}
  const totalAssignments = evidence.assignments + evidence.worksheetAssignments
  const activity = [
    totalAssignments > 0 ? countLabel(totalAssignments, "assignment") : null,
    evidence.reflections > 0 ? countLabel(evidence.reflections, "reflection") : null,
    evidence.moodCheckIns > 0 ? countLabel(evidence.moodCheckIns, "mood check-in") : null,
    evidence.progressNotes > 0 ? countLabel(evidence.progressNotes, "progress note") : null,
  ].filter((item): item is string => Boolean(item))

  const fallbacks = {
    clientOverview: activity.length > 0
      ? `The current record includes ${activity.join(", ")}. Review the sections below for the available details.`
      : noData,
    progressSinceLastSession: evidence.progressNotes > 0 || evidence.sessionPrepNotes > 0
      ? "The record includes prior clinical notes, but it does not contain enough structured information to summarize a change over time safely."
      : noData,
    moodTrends: evidence.moodCheckIns > 0
      ? `The record includes ${countLabel(evidence.moodCheckIns, "mood check-in")}; review the recorded ratings and notes directly for the current pattern.`
      : noData,
    reflectionThemes: evidence.reflections > 0
      ? `The record includes ${countLabel(evidence.reflections, "reflection")}; review the submitted text directly for themes.`
      : noData,
    homeworkProgress: totalAssignments > 0
      ? `The record includes ${countLabel(totalAssignments, "assignment")}; review the assignment statuses and responses for completion details.`
      : noData,
  }

  const normalizedText = (candidate: unknown, fallback: string) => (
    typeof candidate === "string" && candidate.trim() ? candidate.trim() : fallback
  )

  return {
    clientOverview: normalizedText(value.clientOverview, fallbacks.clientOverview),
    progressSinceLastSession: normalizedText(value.progressSinceLastSession, fallbacks.progressSinceLastSession),
    moodTrends: normalizedText(value.moodTrends, fallbacks.moodTrends),
    reflectionThemes: normalizedText(value.reflectionThemes, fallbacks.reflectionThemes),
    homeworkProgress: normalizedText(value.homeworkProgress, fallbacks.homeworkProgress),
    suggestedDiscussionTopics: Array.isArray(value.suggestedDiscussionTopics)
      ? value.suggestedDiscussionTopics
          .filter((topic): topic is string => typeof topic === "string" && topic.trim().length > 0)
          .map((topic) => topic.trim())
          .slice(0, 6)
      : [],
    suggestedInterventions: Array.isArray(value.suggestedInterventions)
      ? value.suggestedInterventions
          .filter((item): item is { name: string; rationale: string } => (
            Boolean(item)
            && typeof item === "object"
            && typeof (item as { name?: unknown }).name === "string"
            && typeof (item as { rationale?: unknown }).rationale === "string"
          ))
          .map((item) => ({ name: item.name.trim(), rationale: item.rationale.trim() }))
          .filter((item) => item.name && item.rationale)
          .slice(0, 5)
      : [],
    homeworkRecommendation: value.homeworkRecommendation
      && typeof value.homeworkRecommendation === "object"
      && typeof value.homeworkRecommendation.title === "string"
      && typeof value.homeworkRecommendation.rationale === "string"
      ? {
          title: value.homeworkRecommendation.title.trim(),
          rationale: value.homeworkRecommendation.rationale.trim(),
        }
      : null,
  }
}
