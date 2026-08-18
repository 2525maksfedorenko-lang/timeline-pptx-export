Use `Tooltip` for icon-only controls — the collapsed sidebar labels every item this way (`side="right"`).

```jsx
<Tooltip content="Projects" side="right"><Button variant="ghost" size="icon"><Icon name="folder-kanban" /></Button></Tooltip>
```

Note: tooltips in the product open with **zero delay** (`TooltipProvider delayDuration={0}`).
