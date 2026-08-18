import type { HTMLAttributes, ReactNode } from "react"

/** Scrolling viewport used inside Kanban lanes and long panels. */
export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> { children?: ReactNode }
export function ScrollArea(props: ScrollAreaProps): JSX.Element
