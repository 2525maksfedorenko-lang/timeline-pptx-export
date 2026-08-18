Use `Table` for the projects list and admin lists.

```jsx
<div style={{ borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", padding: 8 }}>
  <Table>
    <TableHeader><TableRow><TableHead>Project name</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
    <TableBody><TableRow clickable><TableCell>Rollout DACH</TableCell><TableCell><span style={{ background: "var(--status-ontrack-bg)", color: "var(--status-ontrack-fg)", borderRadius: "var(--radius-md)", padding: "4px 8px", fontSize: "var(--text-xs)" }}>on track</span></TableCell></TableRow></TableBody>
  </Table>
</div>
```

Notes
- The product wraps the table in a `rounded-md border bg-card` box with **8px** padding — not a Card.
- Status chips are palette-coloured spans, not `Badge`; lowercase copy ("on track", "delayed", "done").
- Rows are clickable and hover to `muted/50`; the trailing actions cell stops propagation.
