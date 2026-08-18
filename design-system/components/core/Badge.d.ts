import type { HTMLAttributes, ReactNode } from "react"

/** Pill label for counts, states and tags. Fully rounded, 12px semibold. */
export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
  children?: ReactNode
}
export function Badge(props: BadgeProps): JSX.Element
