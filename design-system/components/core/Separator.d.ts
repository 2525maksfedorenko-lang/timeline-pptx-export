import type { HTMLAttributes } from "react"

/** 1px hairline rule in border colour. */
export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
}
export function Separator(props: SeparatorProps): JSX.Element
