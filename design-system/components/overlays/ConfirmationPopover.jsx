import React from "react"
import { AlertDialog } from "./AlertDialog.jsx"

/* Despite the name, the product's ConfirmationPopover is an AlertDialog — a centred modal,
   not an anchored bubble. Its labels come from the common i18n namespace: "Cancel" / "Ok". */
export function ConfirmationPopover({ open = true, title, prompt, onConfirm, onCancel, style }) {
  return (
    <AlertDialog
      open={open}
      title={title}
      description={prompt}
      cancelLabel="Cancel"
      confirmLabel="Ok"
      onConfirm={onConfirm}
      onCancel={onCancel}
      style={style}
    />
  )
}
