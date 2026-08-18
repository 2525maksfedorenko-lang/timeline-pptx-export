import type { HTMLAttributes, ReactNode } from "react"

/**
 * Centred modal: 512px max width, 24px padding, 8px radius, shadow-lg, 80% black scrim.
 */
export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
  style?: React.CSSProperties
}
export function Dialog(props: DialogProps): JSX.Element | null
export function DialogHeader(props: HTMLAttributes<HTMLDivElement>): JSX.Element
export function DialogTitle(props: HTMLAttributes<HTMLHeadingElement>): JSX.Element
export function DialogDescription(props: HTMLAttributes<HTMLParagraphElement>): JSX.Element
export function DialogFooter(props: HTMLAttributes<HTMLDivElement>): JSX.Element
