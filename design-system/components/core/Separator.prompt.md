Use `Separator` to divide menu sections, card halves and toolbar groups.

```jsx
<Separator />
<Separator orientation="vertical" style={{ height: 20 }} />
```

Note: inside cards the product often inlines the same rule as `<div style={{ height: 1, background: "hsl(var(--border))" }} />` — visually identical.
