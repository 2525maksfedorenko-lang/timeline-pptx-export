Use `AlertDialog` for confirmations, including irreversible ones (delete project, delete user, delete account).

```jsx
<AlertDialog title="Delete Project"
  description="All items associated with this project will also be permanently deleted. Are you sure? You will not be able to undo this action."
  confirmLabel="Delete" destructive onCancel={close} onConfirm={remove} />
```

Source values
- Content: `max-w-lg`, `gap-4`, `p-6`, `border`, `bg-background`, `shadow-lg`, `sm:rounded-lg`, scrim `black/80`.
- Header: `space-y-2` (8px); title `text-lg font-semibold text-foreground` (**no tracking-tight** — that's CardTitle); description `text-sm text-muted-foreground`.
- Footer: `sm:justify-end sm:space-x-2`, **Cancel first** using `buttonVariants({variant:"outline"})`, then the action using plain `buttonVariants()` — i.e. **primary, not destructive**, even on delete flows. Pass `destructive` only where the calling screen opts into it.
- Copy pattern: "Delete {{type}}" / "All items associated with this {{type}} will also be permanently deleted. Are you sure? You will not be able to undo this action."
