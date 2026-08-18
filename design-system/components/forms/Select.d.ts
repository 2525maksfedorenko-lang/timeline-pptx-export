import type { HTMLAttributes } from "react"

/** Dropdown single-select. 40px trigger with chevron, popover list with left check column. */
export interface SelectOption { value: string; label: string }
export interface SelectProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** the product sets explicit trigger widths, e.g. 160 / 170 on the channels filter bar */
  width?: number | string
}
export function Select(props: SelectProps): JSX.Element
export function SelectItem(props: { label: string; selected?: boolean; onSelect?: () => void }): JSX.Element
