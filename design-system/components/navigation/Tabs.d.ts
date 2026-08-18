/**
 * Segmented tab switcher. 40px pill on muted background; the active tab is a white card.
 * @startingPoint section="Navigation" subtitle="Status tabs and segmented switcher" viewport="700x150"
 */
export interface TabsItem { value: string; label: string }
export interface TabsProps {
  tabs: TabsItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: React.ReactNode
  style?: React.CSSProperties
}
export function Tabs(props: TabsProps): JSX.Element
