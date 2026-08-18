import type { ReactNode } from "react"

/** Anchored floating panel, 288px wide, 16px padding. */
export interface PopoverProps {
  trigger: ReactNode
  children?: ReactNode
  align?: "start" | "center" | "end"
  width?: number
  defaultOpen?: boolean
  style?: React.CSSProperties
}
export function Popover(props: PopoverProps): JSX.Element
