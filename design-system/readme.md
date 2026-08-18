# aicoo Coordinator — Design System

The design system for **aicoo Coordinator**, the AI project-coordination platform built by aicoo
(support address in the product: it@aicoo.ai). Everything here is ported from the product's own
frontend — no invented components, colours or type.

## Sources

| Source | What was read |
|---|---|
| `github.com/aicoo2/coordinator` (private, branch `master`) | `frontend/src/globals.css`, `frontend/tailwind.config.js`, all 33 files in `frontend/src/components/ui/`, the `.design-sync/` notes and conventions, screen routes (`routes/login.tsx`, `_layout.tsx`, `_layout/index.tsx`, `projects/index.tsx`, `communication.channels.tsx`, `wiki.tsx`), feature components (`Sidebar/`, `Kanban/`, `ProjectsDashboard/`, `Channels/`, `Wiki/`, `Layout/AppHeader`), `src/locales/en/*.json`, and `frontend/public/assets/images/` |

The repository is private — explore it directly if you have access; it is the ground truth for
anything this system does not cover (Gantt chart, resource-planning board, MCP gateway screens).

## What the product is

Coordinator is a **workspace-scoped project coordination platform with an AI assistant**. Real
communication — Slack channels, email addresses, meeting transcripts (Sembly), in-app recordings and
chat — is routed into *communication channels*, analysed, and turned into **proposals**: proposed new
tasks and proposed updates to existing ones, which a human accepts or rejects. Around that sit
projects and work items (project → phase → task), a Gantt plan and Kanban board, per-project and
per-workspace wikis, resource planning, and a usage/KPI dashboard.

Surfaces represented here:

- **Coordinator web app** (the only product) — login, dashboard, project plan (Kanban), communication
  channels, wiki. React 18 + Vite + TanStack Router, Tailwind + Radix (shadcn/ui pattern), i18n in
  English and German.

There is no marketing site, docs site or mobile app in the source, so none is recreated.

## Content fundamentals

**Voice: neutral, operational, third-person.** The UI describes the system's state, it does not
address the user or speak as itself. There is no "we", almost no "you" — "you" appears only where
ownership matters ("Shared with you", "Owned by me", the "You" chip on a channel you own).

**Casing: sentence case for prose, Title Case for labels of first-class objects.** Buttons and menu
items are Title Case ("Load More", "Add workspace", "Open Project Plan", "Help & Support"); KPI card
titles are Title Case ("Proposed Task Updates", "Delayed Projects"); explanations under them are
sentence case ("Tasks with pending update proposals", "Projects ETC beyond the deadline").

**Status words are lowercase.** `on track`, `delayed`, `done` — deliberately lowercase in the
projects table, while `Active` / `Inactive` (assistant state) are capitalised.

**Short, verb-first, no fluff.** "Create", "Save", "Delete", "Restore", "Load More", "Refresh".
Progress states get an ellipsis: "Saving...", "Processing...", "Connecting...", "Loading...".

**Errors state the failure, then the retry.** "Failed to create task. Please try again."
"Some KPI values could not be loaded." "An error occurred while deleting the {{type}}."

**Destructive copy spells out the consequence** rather than softening it: "All items associated with
this project will also be permanently deleted. Are you sure? You will not be able to undo this
action."

**Empty states are one flat sentence.** "No results found", "No data available", "No items to
display", "No tasks", "No user activity has been tracked yet."

**Domain vocabulary — use these exact words:** workspace, project, work item, phase, task, proposal
(CREATE / UPDATE), misalignment, channel, source, wiki, plan, scope, ETC, deadline, assistant.
A "work item" is never a "ticket"; a "channel" is never a "conversation".

**No emoji anywhere.** No exclamation marks except in one toast ("Copied to clipboard!"). No
marketing adjectives. German is a first-class locale, so keep strings short — German runs ~30% longer,
which is why titles truncate rather than wrap.

## Visual foundations

**Colour.** One deep navy — `212 30% 17%` — is the whole brand: it is `--primary`, the sidebar
background, and the logo's dark variant. Its companion is a pale blue-grey `210 33% 94%`
(`--primary-foreground`, `--base-background`) used for text on navy and for the app's chrome
background. Everything else is neutral: near-black text (`0 0% 3.9%`), one grey for muted / accent /
secondary (`0 0% 96.1%`), mid-grey secondary text (`0 0% 45.1%`), one border grey (`0 0% 89.8%`).
Colour beyond that appears **only as meaning**: green for on-track/done, red for delayed and
destructive, orange for issues, purple for projects and proposals, amber for phases, blue for tasks,
and per-source tints on channel cards. Tokens store **raw HSL components**, so always write
`hsl(var(--primary))`.

**Type.** No webfont — the platform UI stack (`ui-sans-serif, system-ui, …`). The scale is
Tailwind's: 14px body (the product default), 12px meta, 18px semibold page titles, 24px semibold card
titles and bold KPI numbers, 13px sidebar sub-items, 10px micro badges. Weights used: 400, 500, 600,
700. Tracking is default except `-0.025em` on 24px titles.

**Backgrounds are flat.** White (`--background`) for content, navy for the sidebar, `--base-background`
pale blue-grey for app chrome. **No gradients** anywhere except two functional ones: the Gantt
out-of-range fades and the recording pulse. No photography, no illustration, no texture, no pattern,
no full-bleed imagery. The only images in the product are the logo and three vendor marks.

**Cards.** 1px border in `--border`, 8px radius, `--shadow-sm` at rest, white `--card` fill.
Clickable cards go to `hsl(var(--muted) / 0.5)` and `--shadow-md` on hover. Channel and wiki cards are
the exception: 12px radius, no resting shadow, shadow-md on hover. "Add" affordances use a dashed
border. Selection is a coloured border plus a 2px ring at 20% (or the kind-coloured glow rings for
Kanban rows).

**Radii.** One `--radius: 0.5rem` drives `lg` 8 / `md` 6 / `sm` 4; `xl` 12 for the two card types
above; `full` for badges, switches, progress bars, avatars and status dots.

**Shadows.** Tailwind's sm / default / md / lg only — sm at rest, md for hover and menus, lg for
dialogs and sheets. **No inner shadows, no coloured glows** except the three Kanban selection rings.

**Motion is minimal and functional.** 150ms colour transitions on hover, 200ms ease-out for
accordion/collapse and chevron rotation, 200ms linear for the sidebar width. One decorative
animation exists: the 1.75s recording pulse rings on the recorder button. **Nothing scales, bounces,
slides for decoration, or fades in on scroll.**

**Hover / press / focus.** Hover = colour only: primary fills darken to /0.9, secondary to /0.8,
ghost and outline fill with `--accent`, rows and cards fill with `muted/50`. There is **no press
state** beyond the browser default — nothing shrinks. Focus is a 2px `--ring` ring at 2px offset.
Disabled is `opacity: 0.5` plus `pointer-events: none`.

**Transparency and blur.** Slash-opacity tokens are used freely (`primary/10` for icon chips,
`muted/50` for hover, `sidebar-foreground/70` for labels, `primary/20` for selection rings) but
**no backdrop blur anywhere**. Modal scrims are flat `black/80`.

**Layout.** Fixed 18rem sidebar (3rem collapsed) + a 48px app header, both fixed; only the content
region scrolls. List pages centre on `max-w-6xl` (1152px) with 24px gutters (12px mobile). Card grids
are 3-up with 14px gaps. Kanban lanes are a fixed 288px wide with sticky 44px headers and their own
scroll areas. Density: 24px card padding, 16px table cells, 12px Kanban cards, 8px control gaps.

**Dark mode** is a `.dark` class swap on the same token names: surfaces go to deep navy
(`212 30% 11%` background, `212 22% 8%` cards), `--primary` inverts to near-white, and the sidebar
keeps its navy.

## Iconography

- **lucide is the only icon system** (`lucide-react@0.436.0` in the product; `react-icons` appears in
  exactly one place, the login password eye). No icon font, no sprite, no PNG icons, **no emoji**, no
  unicode glyphs used as icons.
- Default 16px, stroke 2, `currentColor`. 14px in dense rows (Kanban meta, sub-nav), 20px for
  page-title icons, 10–12px inside micro badges.
- `Icon` in this system renders lucide from the CDN UMD build — add
  `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>` to the page.
  The vanilla `lucide` package has no 0.436.0 release, so the CDN link is unpinned; pin it to a real
  `lucide` version if you need byte-stability.
- The product's working icon vocabulary is listed in `components/icons/Icon.prompt.md`.
- Vendor marks are real SVG assets, copied in: `assets/slack-logo.svg`, `assets/teams-logo.svg`,
  `assets/sembly-ai-logo.svg`.
- The aicoo logo is an **orbit mark** (seven nodes joined by chords) plus a lowercase `aicoo`
  wordmark. Ten variants are in `assets/`; the sidebar uses `aicoo-logo-orbit-lightblue-text.svg` at
  32px, login uses `aicoo-logo-orbit-darkblue-outline-lightblue-text.svg` at 48px.

## Index

- `styles.css` — the single entry point consumers link. Imports only.
- `tokens/` — `fonts.css`, `colors.css`, `status-palette.css`, `typography.css`, `spacing.css`,
  `radius.css`, `elevation.css`, `motion.css`, `base.css`.
- `guidelines/` — 19 specimen cards: colour (brand, neutrals, semantic, Kanban, sources, kinds, dark,
  charts), type (scale, roles, mono, font stack), spacing (scale, density, control heights), brand
  (radii, elevation, states, logo).
- `components/` — the primitives, grouped `core/`, `icons/`, `forms/`, `overlays/`, `navigation/`,
  `data/`. Each has a `.jsx`, a `.d.ts` props contract and a `.prompt.md` usage note; each directory
  has one preview card.
- `ui_kits/coordinator/` — click-through recreation of the app. See its own README.
- `assets/` — logos (10 aicoo variants, PNG + SVG), favicon, tab icon, vendor marks.
- `thumbnail.html` — homepage tile.
- `SKILL.md` — Agent-Skills entry point.
- `github.md` — upstream source association and sync record.

## Components

The inventory is exactly the 33 primitives in `frontend/src/components/ui/`, plus one intentional
addition.

**core/** — Button, Badge, Card (CardHeader, CardTitle, CardDescription, CardContent, CardFooter),
Separator, Skeleton, Progress, Link

**icons/** — Icon *(intentional addition: the product imports lucide glyphs directly from
`lucide-react`, which has no counterpart component; this wrapper gives designs one way to render the
same set without hand-drawing SVG)*

**forms/** — Input, Textarea, Label, Checkbox, RadioGroup (RadioGroupItem), Switch, Select
(SelectItem), MultiSelect, Form (FormItem, FormLabel, FormControl, FormDescription, FormMessage),
Calendar, DatePicker, Command

**overlays/** — Dialog (DialogHeader, DialogTitle, DialogDescription, DialogFooter), AlertDialog,
Sheet (SheetHeader, SheetTitle, SheetDescription), Popover, DropdownMenu (DropdownMenuItem), Tooltip,
ConfirmationPopover

**navigation/** — Sidebar (SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup,
SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub,
SidebarMenuSubButton), Tabs, NavigationMenu, Accordion, Collapsible, ScrollArea

**data/** — Table (TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption)

### Differences from the product's implementation

These are cosmetic recreations. The product's versions wrap Radix UI, `react-hook-form`, `cmdk`,
`react-day-picker` and TanStack Router and are driven by Tailwind classes; these are self-contained
React with inline styles over the CSS custom properties. Behaviour is simplified (no portals, no
focus trapping, no form validation engine); every colour, size, radius and padding is copied from the
source.

## Not recreated

Deliberately left out because they are not primitives and would have to be invented rather than
copied: the Gantt chart (`GanttChart/`, ~26 files including a 99k-line task editor), the resource
planning board (`ResourceManagementView.tsx`, 207kB), the wiki content editor
(`WikiContentView.tsx`, 96kB), the LLM testing dashboards, and the admin sections. The UI kit's
Resources screen is intentionally blank with a note rather than approximated.

## About this local copy

Pulled from the Claude Design project "aicoo Coordinator Design System"
(`42e5f111-8000-4a1a-9f1c-0b21057eee71`) on 2026-08-18. Everything under `tokens/`,
`guidelines/`, `components/`, `ui_kits/` and `assets/` is a byte-for-byte copy of that project.

Two files are **build artifacts, regenerated locally** rather than copied, because the design
app rebuilds them from the sources above on every upload:

- `_ds_bundle.js` — the UMD bundle the preview cards and the UI kit load. Rebuilt from
  `components/**/*.jsx` with the repo's own rolldown (`node node_modules/rolldown/bin/cli.mjs`),
  classic JSX pragma, React kept external as the page's `window.React`. It exposes the same 74
  exports on `window.AicooCoordinatorDesignSystem_42e5f1`.
- `_ds_manifest.json` — the card/token index, rebuilt by scanning the `@dsCard` markers and
  `tokens/*.css`.

To view anything, serve the folder over HTTP (the pages fetch siblings and CDN scripts):
`python3 -m http.server` inside `design-system/`, then open `ui_kits/coordinator/index.html`
or any `*.card.html`.
