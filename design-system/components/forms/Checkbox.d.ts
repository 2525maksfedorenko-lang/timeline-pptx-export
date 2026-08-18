import type { ButtonHTMLAttributes } from "react"

/** 16px square, 4px radius, primary border; fills primary when checked. */
export interface CheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}
export function Checkbox(props: CheckboxProps): JSX.Element
