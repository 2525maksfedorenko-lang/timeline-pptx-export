Use `Badge` for short state labels and counts (task counts on Kanban columns, "Proposed", "Shared with you", "Archived").

```jsx
<Badge variant="secondary">12</Badge>
<Badge variant="outline" style={{ fontSize: "var(--text-2xs)" }}>Archived</Badge>
```

Notes
- The product overrides Badge colours with the status palette rather than adding variants, e.g. `style={{ background: "var(--kanban-3-bg)", color: "var(--kanban-3-fg)", borderColor: "var(--kanban-3-border)" }}`.
- Micro badges drop to 10px (`--text-2xs`) — see `Archived` / `Shared with you` on channel cards.
