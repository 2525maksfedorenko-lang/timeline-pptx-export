/** What one plan has to say about itself this session, said once above the
 * chart it is about.
 *
 * Two things produce one now — a plan repaired on its way out of storage, and
 * a plan just made out of a branch of another one — and they are not the same
 * news, so the card's own words come with the news rather than being fixed in
 * the card. */
export interface PlanNotice {
  /** The line the card leads with: what happened to this plan. */
  headline: string;
  /** What it happened to, one plain sentence each. May be empty when the
   * headline is the whole of it. */
  lines: string[];
  /** What the reader should do or know about it, when there is anything. */
  hint?: string;
}

/** What a plan repaired on the way in has to say — see normalizePlanItems for
 * the repairs themselves. Both doors into a plan report it the same way, which
 * is why the wording lives here rather than in either of them. */
export function repairNotice(warnings: string[]): PlanNotice {
  return {
    headline: 'Some tasks were repaired when this plan opened.',
    lines: warnings,
    hint: 'The chart and the export both order tasks by status, so check these before exporting.',
  };
}
