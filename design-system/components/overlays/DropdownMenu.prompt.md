Use `DropdownMenu` for row actions, workspace switching, theme/language pickers and the collapsed-sidebar nav.

```jsx
<DropdownMenu align="end" trigger={<Button variant="ghost" size="icon"><Icon name="ellipsis" /></Button>}
  items={[
    { label: "Open Project Plan", value: "plan" },
    { label: "Open Kanban Board", value: "kanban" },
    { separator: true },
    { label: "Delete", value: "delete" },
  ]} />
```

Notes: sidebar menus open `side="right" align="end"` with `minWidth` 192–224; theme and language menus use `checked` items rather than radios.
