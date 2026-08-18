import type { HTMLAttributes } from "react"

/** Pulsing muted placeholder used while list and table data loads. */
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}
export function Skeleton(props: SkeletonProps): JSX.Element
