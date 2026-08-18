import type { ReactNode } from "react"

/** Headless show/hide wrapper — the product uses it for KPI sections and nav trees. */
export interface CollapsibleProps {
  /** node, or a render function receiving the open state */
  trigger: ReactNode | ((open: boolean) => ReactNode)
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
  style?: React.CSSProperties
}
export function Collapsible(props: CollapsibleProps): JSX.Element
