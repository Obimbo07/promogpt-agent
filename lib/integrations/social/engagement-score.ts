/** Rate-based engagement (uses views/impressions denominator). */
export function engagementScoreRate(views: number, likes: number, comments: number, shares: number): number {
  const v = Math.max(views, 1);
  return Math.round(((likes + comments * 2 + shares * 3) / v) * 10000) / 100;
}

/**
 * Sort key when platform does not expose impressions per post (e.g. Meta feed).
 * Maps interaction counts into ~0–100 for rough cross-post ranking.
 */
export function engagementScoreInteractionOnly(likes: number, comments: number, shares: number): number {
  const raw = likes + comments * 2 + shares * 3;
  return Math.round(Math.min(100, Math.log1p(raw) * 14));
}
