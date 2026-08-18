import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react"

/**
 * Data table. 48px header row in muted text, 16px cell padding, hairline row borders.
 */
export interface TableProps extends HTMLAttributes<HTMLTableElement> { children?: ReactNode }
export function Table(props: TableProps): JSX.Element
export function TableHeader(props: HTMLAttributes<HTMLTableSectionElement>): JSX.Element
export function TableBody(props: HTMLAttributes<HTMLTableSectionElement>): JSX.Element
export function TableFooter(props: HTMLAttributes<HTMLTableSectionElement>): JSX.Element
export function TableRow(props: HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }): JSX.Element
export function TableHead(props: ThHTMLAttributes<HTMLTableCellElement>): JSX.Element
export function TableCell(props: TdHTMLAttributes<HTMLTableCellElement>): JSX.Element
export function TableCaption(props: HTMLAttributes<HTMLTableCaptionElement>): JSX.Element
