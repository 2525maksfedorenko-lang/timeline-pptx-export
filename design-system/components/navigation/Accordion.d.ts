import type { ReactNode } from "react"

/** Single-open disclosure list with bottom-bordered rows. */
export interface AccordionEntry { value: string; title: ReactNode; content: ReactNode }
export interface AccordionProps {
  items: AccordionEntry[]
  defaultOpenValue?: string
  style?: React.CSSProperties
}
export function Accordion(props: AccordionProps): JSX.Element
