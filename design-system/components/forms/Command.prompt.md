Use `Command` for type-ahead pickers (tag search, work-item search, the MultiSelect popover body). The product mounts it inside a `Popover` with `w-auto p-0`.

```jsx
<Command groups={[{ label: "Projects", items: [{ value: "p1", label: "Rollout DACH" }] }]} />
```

Source values
- Root: `flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground` — **no border and no shadow of its own**; the hosting Popover provides them.
- Input row: `border-b px-3` with a 16px search icon at `mr-2 opacity-50`; the input is `h-11` (44px) `py-3 text-sm bg-transparent`.
- List: `max-h-[300px] overflow-y-auto overscroll-contain`.
- Empty: `py-6 text-center text-sm` — **not muted**; copy "No results found."
- Group: `p-1`, heading `px-2 py-1.5 text-xs font-medium text-muted-foreground`.
- Item: `gap-2 rounded-sm px-2 py-1.5 text-sm`, selected row fills `--accent`; icons are forced to 16px.
- Shortcut: `ml-auto text-xs tracking-widest text-muted-foreground`.
- `CommandDialog` exists too: the same Command inside a `DialogContent p-0`, which scales the input to `h-12` and items to `py-3`.
