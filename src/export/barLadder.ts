/* The bar height the *export's* depth ladder is expressed in.
 *
 * This was `src/components/ganttLayout.ts` until the boundaries pass, and
 * before that it held the on-screen Gantt's whole row layout — three sticky
 * columns, their widths, the label/tag fit. That screen was rebuilt to the
 * Gantt design handoff and carries its own geometry in `src/gantt/geometry.ts`
 * (52px rows, 34px bars, a 320px list, 30/15.2/7px per day), so what was left
 * in `components/` was one number that belonged to neither the components nor
 * the screen. It is here now, with the surface it measures.
 *
 * Two things read it: `scripts/checkExportCoverage.ts`, which asserts the
 * slides' own indent ladder against it, and the export settings panel, whose
 * task list indents its rows by the same `labelIndent` the slides do — a
 * component, but one drawing the deck rather than the plan.
 */

/** The reference height `barNesting`'s indent is a fraction of, so it is the
 * unit that rule is read in rather than a size anything is drawn at. */
export const BAR_HEIGHT_PX = 32;
