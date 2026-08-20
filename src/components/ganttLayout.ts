/* The bar ladder the *export* surface is measured against.
 *
 * This file used to hold the on-screen Gantt's whole row layout — three
 * sticky columns, their widths, the label/tag fit. That screen has been
 * rebuilt to the Gantt design handoff and carries its own geometry in
 * `src/gantt/geometry.ts`, which is a different picture: 52px rows, 34px
 * bars, a 320px list, and column widths of 30/15.2/7px per day.
 *
 * What is left here is the pair of numbers the export side still needs: a
 * reference bar height, and the size the percentage is set at on it. Two
 * things read them — the export settings panel, whose task list indents its
 * rows on the same ladder the slides do (`labelIndent`), and
 * `scripts/checkExportCoverage.ts`, which asserts the slides' own ladder
 * against them. Neither is the plan screen.
 */

/** The bar height the depth ladder is expressed in — `barNesting`'s ratios and
 * indents are fractions of it, so it is the unit those rules are read in
 * rather than a size anything is drawn at. */
export const BAR_HEIGHT_PX = 32;

/** The progress percentage's type size in that same unit, which is what
 * decides whether a bar at a given depth is tall enough to hold its label
 * inside itself (`progressLabelFitsInBar`). 12px, not 11: 11 is not a step on
 * the design system's type scale. */
export const PROGRESS_FONT_SIZE_PX = 12;
