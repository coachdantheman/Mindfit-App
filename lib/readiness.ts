export interface ReadinessRatings {
  rating_motivation: number
  rating_focus: number
  rating_confidence: number
  rating_anxiety: number
}

export function readinessScore(ratings: ReadinessRatings): number {
  return Math.round(((ratings.rating_motivation + ratings.rating_focus + ratings.rating_confidence + (11 - ratings.rating_anxiety)) / 4) * 10)
}

export function readinessVerdict(score: number): string {
  return score >= 80 ? 'Locked in: peak window.' :
    score >= 65 ? 'Solid. Execute with intent.' :
    score >= 50 ? 'Steady. Protect your focus.' :
    'Recover first. Identity over output.'
}
