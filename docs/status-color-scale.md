# Status colour scale

Written while fixing text contrast on Gantt bars (branch `fix/bar-contrast`).
This file is generated from the source values — regenerate it rather than
editing by hand if the scale changes.

## Where the saturated steps came from

The task asked to look in `../aicoo-coordinator` for saturated variants of the
status colours. **That directory does not exist** — the only siblings of this
repo are `__pycache__`, `venv` and the repo itself. The product's own frontend
(`github.com/aicoo2/coordinator`) is private and not checked out here, so the
search was done against the vendored copy of its design system instead:

| what | file |
|---|---|
| status + Kanban chip palette | `design-system/tokens/status-palette.css` |
| neutral / brand colour tokens | `design-system/tokens/colors.css` |
| how a chip is composed | `design-system/components/core/Badge.prompt.md` |
| how a status chip is used in a table | `design-system/components/data/Table.prompt.md` |
| chip colours rendered as a specimen | `design-system/guidelines/colors-kanban.card.html` |
| semantic status specimen | `design-system/guidelines/colors-semantic.card.html` |

**A saturated step already exists there, so nothing was invented.** Each Kanban
chip in the design system is a triplet — `--kanban-N-bg` (palest),
`--kanban-N-border`, `--kanban-N-fg` (darkest) — and the `fg` step is a real
dark colour, because upstream it is the chip's *text*. Reused here as a fill it
carries light text comfortably. Alongside those, the system has mid-step tokens
for small non-text marks: `--status-active-dot`, `--status-inactive-dot` and
`--kind-task`.

No derivation function was needed, so none was added.

## The scale

Defined once, in `src/types/timeline.ts` as `TASK_STATUS_SCALE`.

| role | step | used for | design-system token |
|---|---|---|---|
| `surface` | palest | chip background, under dark text — never a fill with text on it | `--kanban-N-bg` / `--status-neutral-bg` |
| `border` | light | the chip's hairline | `--kanban-N-border` / `--border` |
| `accent` | mid | the status dot and other small non-text marks | `--status-active-dot`, `--status-inactive-dot`, `--kind-task`, `--muted-foreground` |
| `solid` | darkest | Gantt bar fills, and status words set as text on a light background | `--kanban-N-fg` / `--status-neutral-fg` |

## Contrast

WCAG AA, normal text, threshold **4.5:1**. Ratios in the table below were
computed by `contrastRatio()`, which used to be exported from
`src/utils/colorContrast.ts`. That module had no caller left and was deleted in
the cleanup pass (docs/cleanup-audit.md); the same formula, to the same
decimals, is now private to `src/gantt/barColor.ts`, which is the one place
that still has to choose a label colour by measurement. The measured values
here are unchanged — the input colours did not move.

| surface | status | background | text | ratio | passes 4.5:1 |
|---|---|---|---|---|---|
| Gantt bar fill · percent inside | to do | `#1F2937` | `#EBF0F5` | 12.80:1 | yes |
| Status chip (app left column) | to do | `#F3F4F6` | `#1F2937` | 13.34:1 | yes |
| Status word on export slide | to do | `#EBF0F5` | `#1F2937` | 12.80:1 | yes |
| Gantt bar fill · percent inside | in progress | `#1E40AF` | `#EBF0F5` | 7.61:1 | yes |
| Status chip (app left column) | in progress | `#DBEAFE` | `#1E40AF` | 7.15:1 | yes |
| Status word on export slide | in progress | `#EBF0F5` | `#1E40AF` | 7.61:1 | yes |
| Gantt bar fill · percent inside | done | `#166534` | `#EBF0F5` | 6.22:1 | yes |
| Status chip (app left column) | done | `#DCFCE7` | `#166534` | 6.49:1 | yes |
| Status word on export slide | done | `#EBF0F5` | `#166534` | 6.22:1 | yes |
| Percent beside bar · on track | — | `#E5E5E5` | `#0A0A0A` | 15.72:1 | yes |

No pair is below the threshold.

The status dot carries no text, so no threshold applies to it; it takes the mid
step so it stays as light and legible-as-a-mark as the product's own dots:

| status | dot |
|---|---|
| to do | `#737373` |
| in progress | `#3B82F6` |
| done | `#22C55E` |

## What the fix changed

Bar fills were the mid step (`#9CA3AF`, `#3B82F6`, `#22C55E`, `#EF4444`), which
gave the percentage inside the bar only 2.28–3.76:1 against white — all four
below AA. Status words in the export were the same mid step drawn on the pale
slide background, at 1.99–3.28:1, which is what made them hard to read on a
projector. Both now use `solid`.

The chip in the app's left column was already correct and is unchanged: it is
the design system's own pale-background-with-dark-text chip.

`readableTextOn()` — since folded into `barTextCss` in `src/gantt/barColor.ts`,
same rule — replaced a luminance threshold of 0.35 that mis-picked
mid-tones — on the demo plan's purple (`#A855F7`) it chose white at 3.96:1 where
dark text reaches 5.00:1. Status fills clear AA with light text by construction;
that function is for fills the palette does not control, namely a user's own
`item.color` and a person's avatar colour, where it now picks whichever token
measures better.
