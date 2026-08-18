import type { HTMLAttributes, ReactNode } from "react"

/** Edge-anchored panel: 3/4 viewport capped at 384px (sm:max-w-sm), 24px padding, 16px gap, shadow-lg. */
export interface SheetProps {
  open?: boolean
  side?: "left" | "right" | "top" | "bottom"
  /** clamped to the source's 384px max for left/right sheets */
  width?: number
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
  style?: React.CSSProperties
}
export function Sheet(props: SheetProps): JSX.Element | null
export function SheetHeader(props: HTMLAttributes<HTMLDivElement>): JSX.Element
export function SheetTitle(props: HTMLAttributes<HTMLHeadingElement>): JSX.Element
export function SheetDescription(props: HTMLAttributes<HTMLParagraphElement>): JSX.Element
export function SheetFooter(props: HTMLAttributes<HTMLDivElement>): JSX.Element
