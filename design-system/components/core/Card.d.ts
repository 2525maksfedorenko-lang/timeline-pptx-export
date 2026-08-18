import type { HTMLAttributes, ReactNode } from "react"

/**
 * Surface container: 8px radius, 1px border, shadow-sm.
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> { children?: ReactNode }
export function Card(props: CardProps): JSX.Element
export function CardHeader(props: CardProps): JSX.Element
export function CardTitle(props: HTMLAttributes<HTMLHeadingElement>): JSX.Element
export function CardDescription(props: HTMLAttributes<HTMLParagraphElement>): JSX.Element
export function CardContent(props: CardProps): JSX.Element
export function CardFooter(props: CardProps): JSX.Element
