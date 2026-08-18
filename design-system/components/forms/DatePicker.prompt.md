Use `DatePicker` for start dates and deadlines outside a form.

```jsx
<DatePicker defaultValue={new Date("2026-09-30")} onChange={setDeadline} />
```

Source values (`components/Common/DatePicker.tsx`)
- Trigger is a **`Button variant="outline"`** with `w-[240px] justify-start text-left font-normal`, a 16px `calendar` icon at `mr-2`, and `text-muted-foreground` while empty.
- Placeholder copy is exactly "Pick a date"; a set date renders via `format(value, "PPP")` → "September 30th, 2026".
- Popover content is `w-auto p-0 align="start"` — the Calendar supplies its own 12px padding.
- `disablePast` in the product maps to react-day-picker's `{ before: new Date() }`.

**Two different date components exist upstream.** `components/ui/date-picker.tsx` is a *different* thing: a react-hook-form field that renders a native `<Input type="date" className="border border-border">` inside `FormItem`/`FormLabel`/`FormControl`/`FormMessage` — and because those read `useFormContext()`, it crashes unless wrapped in a `<Form>` even though it takes `control` as a prop. For a form field, use `Input type="date"` with the `Form*` parts rather than this component.
