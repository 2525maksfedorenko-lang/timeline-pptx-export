/** Multi-value picker: Badge chips in the trigger, a Command list with (Select All) in the popover. */
export interface MultiSelectOption { value: string; label: string }
export interface MultiSelectProps {
  options: MultiSelectOption[]
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** the product's own default is "Select options" */
  placeholder?: string
  /** chips shown before collapsing into "+ N more" — the product's default is 3 */
  maxCount?: number
  width?: number | string
  style?: React.CSSProperties
}
export function MultiSelect(props: MultiSelectProps): JSX.Element
