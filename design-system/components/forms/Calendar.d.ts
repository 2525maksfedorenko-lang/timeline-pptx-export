/** Month grid date picker body (the product wraps react-day-picker). Monday-first. */
export interface CalendarProps {
  /** month to display */
  month?: Date | string
  selected?: Date | string | null
  onSelect?: (date: Date) => void
  style?: React.CSSProperties
}
export function Calendar(props: CalendarProps): JSX.Element
