import type { HTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"

/** Exclusive choice set. Items are 16px circles with a 10px filled dot. */
export interface RadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: ReactNode
}
export interface RadioGroupItemProps extends ButtonHTMLAttributes<HTMLButtonElement> { value: string }
export function RadioGroup(props: RadioGroupProps): JSX.Element
export function RadioGroupItem(props: RadioGroupItemProps): JSX.Element
