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
  /** The one thing here the app cannot tell anyone later. Shown on every
   * screen, phones included. */
  fact?: string;
  /** What to do about it — context rather than fact, so a phone drops it
   * rather than pushing the chart under the fold. */
  hint?: string;
}

/** What a plan repaired on the way in has to say — see normalizePlanItems for
 * the repairs themselves. Both doors into a plan report it the same way, which
 * is why the wording lives here rather than in either of them. */
export function repairNotice(warnings: string[]): PlanNotice {
  return {
    headline: 'Some tasks were repaired when this plan opened.',
    lines: warnings,
    // The repair keeps no copy of what it replaced: the plan is repaired again
    // on every load until it is saved, but nothing anywhere holds the original
    // spelling once it has been.
    fact: 'The original values are kept only in the file this plan came from.',
    hint: 'The chart and the export both order tasks by status, so check these before exporting.',
  };
}
