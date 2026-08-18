/**
 * Date field: a 240px outline button showing the date in date-fns "PPP" form
 * ("September 30th, 2026"), opening a Calendar in a popover.
 * Mirrors the product's components/Common/DatePicker.tsx.
 */
export interface DatePickerProps {
  value?: Date | string | null
  defaultValue?: Date | string | null
  onChange?: (date: Date) => void
  /** the product's own placeholder is "Pick a date" */
  placeholder?: string
  style?: React.CSSProperties
}
export function DatePicker(props: DatePickerProps): JSX.Element
