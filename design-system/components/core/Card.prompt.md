Use `Card` for any panel: KPI tiles, Kanban task cards, dashed "add project" affordances, dialog-like sections.

```jsx
<Card style={{ width: 360 }}>
  <CardHeader><CardTitle>Create project</CardTitle><CardDescription>Deploy in one click.</CardDescription></CardHeader>
  <CardContent><p style={{ fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>Projects group work items, timelines and communication.</p></CardContent>
  <CardFooter style={{ justifyContent: "flex-end", gap: 8 }}><Button variant="outline">Cancel</Button><Button>Deploy</Button></CardFooter>
</Card>
```

Notes
- Default padding is 24px. The product tightens it: KPI cards use `padding: "12px 24px"`-ish headers, Kanban task cards use `<CardContent style={{ padding: 12 }}>`, channel/wiki cards use 14px and a 12px radius (`--radius-xl`).
- Clickable cards hover to `hsl(var(--muted) / 0.5)` and lift to `--shadow-md`.
- Empty-state / create affordances use `borderStyle: "dashed"`.
