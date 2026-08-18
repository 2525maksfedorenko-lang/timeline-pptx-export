Use `ConfirmationPopover` as the app-wide confirm step — it takes a `title` and a `prompt` and owns its buttons.

```jsx
<ConfirmationPopover title="Edit task" prompt="Delete this task?" onConfirm={remove} onCancel={close} />
```

Notes
- **It is not a popover.** The source composes `AlertDialog` + `AlertDialogHeader/Title/Description` + `AlertDialogFooter` with `AlertDialogCancel` and `AlertDialogAction asChild` wrapping a default `Button` — a centred modal with a full-screen scrim. The name is historical.
- Button labels are exactly **"Cancel"** and **"Ok"** (`common:button.cancel` / `common:button.ok`) — not "Confirm", not "Delete".
- It also accepts a `trigger` in the product and manages its own open state when uncontrolled.
