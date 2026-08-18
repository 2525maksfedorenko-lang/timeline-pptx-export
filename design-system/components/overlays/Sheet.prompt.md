Use `Sheet` for detail/edit surfaces that keep list context (wiki detail, wiki access, mobile sidebar).

```jsx
<Sheet open side="right" onOpenChange={setOpen}>
  <SheetHeader><SheetTitle>Onboarding DACH</SheetTitle><SheetDescription>2 linked work items</SheetDescription></SheetHeader>
  <SheetFooter><Button variant="outline" size="sm">Manage access</Button></SheetFooter>
</Sheet>
```

Source values
- `side="right"` is the default. Left/right sheets are `w-3/4` with `sm:max-w-sm` — **384px on desktop**, not a custom width.
- `p-6`, `gap-4`, `shadow-lg`, a side-appropriate border, scrim `black/80`; open 500ms / close 300ms slide.
- Header `space-y-2`, title `text-lg font-semibold text-foreground`, description `text-sm text-muted-foreground`, footer `sm:justify-end sm:space-x-2`.
- A 16px close X sits at `right-4 top-4` at 70% opacity.
- The mobile sidebar is the exception: a left Sheet forced to `--sidebar-width` (18rem) with sidebar colours, `p-0`, and the close button hidden.
