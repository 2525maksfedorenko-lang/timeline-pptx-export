Use `Button` for every clickable action — aicoo Coordinator has no other button component.

```jsx
<Button>Create</Button>
<Button variant="outline" size="sm">Load more</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost" size="icon"><Icon name="grip-vertical" size={14} /></Button>
```

Notes
- `default` is the dark navy primary (`--primary`, 212 30% 17%) — used for Create / Save / submit.
- `outline` renders **muted-foreground text**, not foreground: that is the product's own deviation from stock shadcn. Keep it.
- Icon-plus-label buttons put the lucide icon first at 16px, gap 8px (e.g. `<Plus/> New channel`).
- Pagination buttons in the product are default-variant and go `disabled` at list bounds.
