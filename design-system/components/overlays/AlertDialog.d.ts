/** Confirmation modal. Same shell as Dialog; footer is Cancel (outline) then the action button (default/primary). */
export interface AlertDialogProps {
  open?: boolean
  title: string
  description?: string
  /** the product's own label is "Ok" (common:button.ok) */
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  onCancel?: () => void
  /**
   * false by default — matches the source, whose AlertDialogAction uses buttonVariants()
   * (primary). Only pass true where the app explicitly renders a destructive Delete button.
   */
  destructive?: boolean
  style?: React.CSSProperties
}
export function AlertDialog(props: AlertDialogProps): JSX.Element | null
