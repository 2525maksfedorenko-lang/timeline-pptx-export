import type { HTMLAttributes } from "react"

/** Determinate bar. Fully rounded; primary fill on secondary track. */
export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** 0–100 */
  value?: number
}
export function Progress(props: ProgressProps): JSX.Element
