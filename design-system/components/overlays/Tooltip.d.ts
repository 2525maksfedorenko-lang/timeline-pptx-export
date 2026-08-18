import type { ReactNode } from "react"

/** Hover label. Popover-coloured, 14px, 6px/12px padding. */
export interface TooltipProps {
  content: ReactNode
  side?: "top" | "right" | "bottom"
  children?: ReactNode
  style?: React.CSSProperties
}
export function Tooltip(props: TooltipProps): JSX.Element
