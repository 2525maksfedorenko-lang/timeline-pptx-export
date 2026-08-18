import type { InputHTMLAttributes } from "react"

/** Single-line text field. 40px tall, 6px radius, 12px horizontal padding. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** paints a destructive border — the product sets border-red-500 on field errors */
  invalid?: boolean
}
export function Input(props: InputProps): JSX.Element
