Use `ScrollArea` for any inner scroll region so page chrome (app header, Kanban lane headers, sheet headers) stays put.

```jsx
<ScrollArea style={{ flex: 1, minHeight: 0, padding: 12 }}>…task cards…</ScrollArea>
```

Source values: root `relative overflow-hidden` with a full-size viewport that inherits the parent radius; the scrollbar is **10px** (`w-2.5`) with a 1px transparent border and a fully-rounded thumb in `--border`. No custom scrollbar colours beyond that.
