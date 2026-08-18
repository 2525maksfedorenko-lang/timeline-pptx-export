Use the `Form*` parts to lay out validated fields.

```jsx
<Form>
  <FormItem>
    <FormLabel invalid>Email</FormLabel>
    <FormControl><Input invalid placeholder="you@company.com" /></FormControl>
    <FormMessage>Email is required</FormMessage>
  </FormItem>
</Form>
```

Source values
- `FormItem` is `space-y-2` (8px between label, control and message).
- `FormLabel` is a `Label` with `text-foreground`, switching to `text-destructive` when the field has an error — pass `invalid`.
- `FormDescription` is `text-sm text-muted-foreground` (**14px, not 12px**).
- `FormMessage` is `text-sm font-medium text-destructive` and renders nothing when empty.
- Screens stack fields at 24px (`space-y-6`) — see `routes/login.tsx`.
- Upstream `Form` is literally `FormProvider` from react-hook-form and renders no DOM; the `<form>` element belongs to the screen. Field errors also paint a red border on the control itself (`border-red-500`) — that's the `invalid` prop on `Input`.
