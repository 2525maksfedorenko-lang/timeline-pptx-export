import type { LabelHTMLAttributes, ReactNode } from "react"

/** Field label: 14px medium, line-height 1. */
export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> { children?: ReactNode }
export function Label(props: LabelProps): JSX.Element
