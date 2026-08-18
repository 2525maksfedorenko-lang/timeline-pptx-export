/**
 * Confirm-before-acting wrapper used across the app (delete a task from its card,
 * delete a status column). Despite the name it renders an AlertDialog modal.
 */
export interface ConfirmationPopoverProps {
  open?: boolean
  /** short action title, e.g. "Edit task" */
  title: string
  /** the question, e.g. "Delete this task?" */
  prompt: string
  onConfirm?: () => void
  onCancel?: () => void
  style?: React.CSSProperties
}
export function ConfirmationPopover(props: ConfirmationPopoverProps): JSX.Element
