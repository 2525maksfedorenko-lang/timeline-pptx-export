import type { AnchorHTMLAttributes, ReactNode } from "react"

/** Inline text link. In the product this wraps TanStack Router's Link. */
export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> { children?: ReactNode }
export function Link(props: LinkProps): JSX.Element
