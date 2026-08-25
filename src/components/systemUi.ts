// The design system's control contracts, transcribed once.
//
// `design-system/` is reference material, not a package: its primitives are
// plain .jsx with inline styles, excluded from `tsc -b` and from oxlint, and
// nothing in src/ can import them (see docs/design-system-map.md §0). So a
// control here cannot *be* the system's Button — it can only be drawn to the
// same contract, and this file is that contract written down in one place
// rather than re-typed at each of the twenty-odd call sites.
//
// Every value below is copied from the source, not chosen:
//   variants + sizes   design-system/components/core/Button.jsx
//   input geometry     design-system/components/forms/Input.jsx
//   focus / disabled   design-system/guidelines/states.card.html
//
// Nothing new is invented here. Where the system has no answer — the Gantt's
// own geometry, the 9px tag pill — the deviation is recorded in
// docs/design-system-map.md instead of being smuggled in as a variant.

/** 2px ring at 2px offset, in `--ring`. The system's only focus treatment:
 * "Focus states are 2px rings offset 2px, never glows." */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Disabled, per states.card.html and Button.jsx: half opacity, and inert —
 * `pointer-events: none`, not merely a different cursor. */
export const DISABLED = 'disabled:pointer-events-none disabled:opacity-50';

// Shared by every variant and size. `transition-colors` is the system's
// 150ms colour-only transition; nothing scales or bounces.
const BUTTON_BASE =
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors ${DISABLED} ${FOCUS_RING}`;

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

// Hover is colour only: primary fills darken to /0.9, secondary to /0.8, ghost
// and outline fill with --accent.
const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline:
    'border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
};

// The four heights the system has, and no others: 36 / 40 / 44, plus the
// square icon button. `--control-height-*` in tokens/spacing.css.
const BUTTON_SIZE: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
};

/** A button's classes. `extra` is for layout only — flex behaviour, margins,
 * the mobile touch-target minimums — never for colour, size or state, which
 * are the system's to decide. */
export function buttonClass(
  variant: ButtonVariant = 'default',
  size: ButtonSize = 'default',
  extra = '',
): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${BUTTON_SIZE[size]}${extra ? ` ${extra}` : ''}`;
}

/** The same button, minus the size — for the handful of controls that have to
 * set their own height because the design system has no step at it.
 *
 * The Gantt handoff's toolbar is the only caller: its segmented control and
 * filter chips are 28px and its Today button 32px, against the system's
 * 36/40/44. Those cannot be layered on top of a size from `buttonClass`,
 * because `h-7` and `h-9` are then both in the class list and which one wins
 * is decided by Tailwind's ordering rather than by us. So the size is left
 * out here and supplied by the caller, deliberately and visibly, rather than
 * being smuggled in as an override. */
export function buttonBaseClass(variant: ButtonVariant = 'default', extra = ''): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANT[variant]}${extra ? ` ${extra}` : ''}`;
}

/** A text input, select or textarea. h-10, `--radius-md`, 1px `--input`.
 *
 * `max-md:text-base` is the iOS Safari zoom guard and is deliberately part of
 * the contract rather than left to call sites: Safari zooms the page on focus
 * for anything under 16px, so a control that forgets it is a bug, not a style
 * choice. It is the one place this file knowingly leaves the 14px control size. */
export const INPUT_CLASS =
  `h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground max-md:text-base ${FOCUS_RING}`;

/** The input contract with its height and type size left out, for the same
 * reason `buttonBaseClass` exists: the Gantt handoff's search box is 32px at
 * 12px type, and stacking `h-8 text-xs` on top of `h-10 text-sm` would leave
 * two conflicting utilities in one class list. Everything else — the radius,
 * the 1px `--input` border, the padding, the focus ring — is the system's and
 * comes along. */
export const INPUT_SHELL_CLASS =
  `w-full rounded-md border border-input bg-background px-3 py-2 text-foreground ${FOCUS_RING}`;

/** The same contract for a control that has to size itself to its content
 * (a number field in a row of them), keeping height, border and type. */
export const INPUT_CLASS_AUTO =
  `h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground max-md:text-base ${FOCUS_RING}`;

/** A checkbox, from design-system/components/forms/Checkbox.jsx: 16x16,
 * `--radius-sm`, a 1px `--primary` border, and `--primary` as the checked fill.
 * The system draws its own box; a native input gets the same result through
 * `accent-color`, which is what `accent-primary` sets. */
export const CHECKBOX_CLASS =
  `h-4 w-4 flex-shrink-0 rounded-sm border border-primary accent-primary ${DISABLED} ${FOCUS_RING}`;

/** A card: 1px `--border`, 8px radius, `--card` fill, and the system's
 * card-at-rest shadow — which in Tailwind v4 is `shadow-xs`, not `shadow-sm`
 * (the v3 → v4 rename, see docs/design-system-map.md §6). */
export const CARD_CLASS = 'rounded-lg border border-border bg-card shadow-xs';

/** A menu surface, from design-system/components/overlays/DropdownMenu.jsx:
 * 224px at its narrowest, `--radius-md`, a 1px `--border` hairline, the
 * `--popover` fill and 4px of padding around the rows, on `--shadow-md`.
 *
 * The system's own menu is a trigger plus a list; only the surface and its
 * rows are contract, since where a menu opens is the caller's business — a
 * dropdown hangs off its button, a context menu opens at the pointer. */
export const MENU_SURFACE_CLASS =
  'z-50 min-w-56 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md';

// A menu row's geometry, shared by both its colourways.
const MENU_ITEM_BASE =
  `flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm ${DISABLED} ${FOCUS_RING}`;

/** One row of a menu: 6px by 8px, `--radius-sm`, 14px type, and the system's
 * one hover treatment for a row — filled with `--accent`. */
export const MENU_ITEM_CLASS = `${MENU_ITEM_BASE} hover:bg-accent hover:text-accent-foreground`;

/** The same row for an action that cannot be undone.
 *
 * The system's DropdownMenu has one row treatment and no destructive variant,
 * so this pairs its geometry with the destructive treatment the system does
 * define and this app already uses on its delete button: the label in
 * `--destructive`, hover filling with a tenth of it. Recorded as a deviation
 * in docs/design-system-map.md rather than passed off as the system's own. */
export const MENU_ITEM_DESTRUCTIVE_CLASS =
  `${MENU_ITEM_BASE} text-destructive hover:bg-destructive/10`;

/** The hairline between groups of rows: 1px of `--muted`, pulled out through
 * the surface's own padding so it reaches both edges. */
export const MENU_SEPARATOR_CLASS = '-mx-1 my-1 h-px bg-muted';

/** A menu's heading — what the rows below it act on. */
export const MENU_LABEL_CLASS = 'px-2 py-1.5 text-sm font-semibold';
