import type { ButtonHTMLAttributes } from "react"

/** 36x20 toggle with a 16px thumb. Primary when on, input grey when off. */
export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}
export function Switch(props: SwitchProps): JSX.Element
