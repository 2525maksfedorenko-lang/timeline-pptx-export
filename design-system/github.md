repo: aicoo2/coordinator
branch: master
path: frontend

## Last sync

date: 2026-08-18T12:00:06Z

### Updated in this project

- Ported all colour, type, spacing, radius, shadow and motion tokens from `frontend/src/globals.css` and `tailwind.config.js`.
- Rebuilt all 33 `frontend/src/components/ui` primitives as self-contained React components with props contracts and usage notes.
- Copied the ten aicoo logo variants and three vendor marks from `frontend/public/assets/images`.
- Recreated login, dashboard, Kanban plan, channels and wiki as a click-through UI kit.
- Reconciled Accordion, AlertDialog, Calendar, Collapsible, Command, ConfirmationPopover, DatePicker, Form, Link, MultiSelect, NavigationMenu, ScrollArea and Sheet against their source files.

## Sync history

- 2026-08-18T11:40:00Z — initial import: tokens, 33 primitives, assets, UI kit.

## Screen map

| Screen | Built from |
|---|---|
| `ui_kits/coordinator/LoginScreen.jsx` | `frontend/src/routes/login.tsx` |
| `ui_kits/coordinator/AppShell.jsx` | `frontend/src/routes/_layout.tsx`, `components/Sidebar/AppSidebar.tsx`, `components/Sidebar/NavMain.tsx`, `components/Sidebar/WorkspaceSwitcher.tsx`, `components/Layout/AppHeader.tsx` |
| `ui_kits/coordinator/DashboardScreen.jsx` | `frontend/src/routes/_layout/index.tsx`, `components/ProjectsDashboard/KpiCards.tsx`, `components/ProjectsDashboard/ProjectsTable.tsx` |
| `ui_kits/coordinator/ProjectPlanScreen.jsx` | `components/Kanban/StatusColumn.tsx`, `components/Kanban/TaskCard.tsx` |
| `ui_kits/coordinator/ChannelsScreen.jsx` | `frontend/src/routes/_layout/communication.channels.tsx`, `components/Channels/ChannelCard.tsx` |
| `ui_kits/coordinator/WikiScreen.jsx` | `frontend/src/routes/_layout/wiki.tsx`, `components/Wiki/WikiCard.tsx` |
| `tokens/*.css` | `frontend/src/globals.css`, `frontend/tailwind.config.js` |
| `components/**` | `frontend/src/components/ui/*.tsx` (33 files) |
| `assets/*` | `frontend/public/assets/images/*` |
