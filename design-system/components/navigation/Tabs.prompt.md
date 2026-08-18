Use `Tabs` for status switching on list pages (Active / Archived) and for section switching in settings.

```jsx
<Tabs defaultValue="active" tabs={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} />
```

Note: the "Group by" control on the channels page is a **look-alike, not Tabs** — a bordered `bg-muted/60` row of buttons with 0.5 gap and `rounded-lg`. Reach for Tabs first; copy that pattern only when you need a lighter, inline row.
