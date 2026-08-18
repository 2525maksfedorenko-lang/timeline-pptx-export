# UI kit — aicoo Coordinator web app

A click-through recreation of the product's core surfaces, composed from this design system's
primitives. Open `index.html`.

## Flow

1. **Login** — email + password (any password works; empty shows the real validation message),
   logo lockup, legal footer links.
2. **Dashboard** — collapsible KPI row, dashed "Add project" card, projects table with assistant-state
   dots, status chips, due dates, progress bars, row action menus, pagination. Clicking a row opens
   the project plan.
3. **Project plan (Kanban)** — four status lanes (288px, sticky headers with drag handles, edit button
   and a status-type-coloured count badge), task cards with kind icons, dates, assignee stacks,
   sub-task counts, comment/proposal indicators and misalignment/mail badges, an archived divider, and
   a working "Add task" button per lane.
4. **Communication channels** — filter bar (search, source select, owner select, Active/Archived
   tabs), a Group-by segmented row, workspace sharing defaults, source-tinted channel cards grouped
   by project, and a right-hand detail sheet.
5. **Wiki** — search + status tabs with a loading skeleton state, wiki cards, detail sheet with page
   list.
6. **Sidebar** — workspace switcher menu, expandable Projects and Communication trees, appearance /
   language / user menus (Log out returns to login), collapse to the 3rem icon rail.

## Files

| File | Contents |
|---|---|
| `index.html` | shell, script loading, login ↔ app routing |
| `data.jsx` | fake projects, KPIs, board, channels, wikis |
| `AppShell.jsx` | sidebar + app header + route switching |
| `LoginScreen.jsx` | `/login` |
| `DashboardScreen.jsx` | `/` — KPI cards + projects table |
| `ProjectPlanScreen.jsx` | `/projects/$workitemId/project-plan` — Kanban |
| `ChannelsScreen.jsx` | `/communication/channels` |
| `WikiScreen.jsx` | `/wiki` |

## Known gaps

The Gantt view, resource planning board, wiki content editor and admin sections are not recreated —
they are large bespoke views, and approximating them would misrepresent the product. The Resources
nav item shows an explicit placeholder for that reason.
