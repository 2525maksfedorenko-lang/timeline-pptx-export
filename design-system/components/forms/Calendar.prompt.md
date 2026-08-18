Use `Calendar` inside a `Popover` (see `DatePicker`), not standalone.

```jsx
<Calendar selected={date} onSelect={setDate} />
```

Source values (the product's `react-day-picker` `classNames` map)
- Root `p-3`; month stack `space-y-4`; caption centred with `pt-1`, label `text-sm font-medium`.
- Nav buttons are **outline buttons at `h-7 w-7`** (28px), `bg-transparent p-0 opacity-50 hover:opacity-100`, absolutely placed at `left-1` / `right-1`.
- Weekday cells: `w-9 font-normal text-[0.8rem] text-muted-foreground`.
- Day cells are **36×36** (`h-9 w-9`), rendered as ghost buttons with `font-normal`; rows `mt-2`.
- Selected = `bg-primary text-primary-foreground` (kept on hover/focus); **today = `bg-accent text-accent-foreground`**; outside days `text-muted-foreground opacity-50`; disabled the same opacity.
- `showOutsideDays` is on by default in the product; this build renders blanks instead.
- Week starts Sunday (en-US locale default).
