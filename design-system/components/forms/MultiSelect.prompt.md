Use `MultiSelect` for assignees, tags and stakeholder pickers.

```jsx
<MultiSelect defaultValue={["ml"]} options={[{ value: "ml", label: "M. Lang" }, { value: "jd", label: "J. Dorn" }]} />
```

Source values
- Trigger is a `Button` forced to `flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit` — it grows as chips wrap.
- Chips are real `Badge`s with `m-1 max-w-[200px] border-foreground/10 text-foreground bg-card hover:bg-card/80`, a truncating label and a 16px `x-circle` that removes just that value.
- Beyond `maxCount` (3) a transparent "+ N more" badge appears; its x-circle trims the overflow.
- Right cluster: a 16px `x` (clear all) in muted, a vertical `Separator` at `min-h-6`, then a muted chevron — all at `mx-2`.
- Empty trigger shows the placeholder at `text-sm text-muted-foreground mx-3`.
- Popover is `w-auto p-0 align="start"` containing a `Command` whose input placeholder is "Search...", empty copy "No results found.", a leading **"(Select All)"** item, per-option 16px `rounded-sm border-primary` check squares (unselected are `opacity-50` with the tick hidden), then a separated footer row of "Clear" and "Close".
- `animation` (bouncing badges) exists in the source but defaults to 0 — leave it off.
