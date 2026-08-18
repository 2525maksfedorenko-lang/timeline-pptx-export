Use `Collapsible` when the trigger is custom (a heading row with a Show/Hide link, a nav item with a chevron).

```jsx
<Collapsible defaultOpen trigger={(open) => (
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
    <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, margin: 0 }}>Key Performance Indicators</h2>
    <span style={{ fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>{open ? "Hide" : "Show"}</span>
  </div>
)}>
  …cards…
</Collapsible>
```
