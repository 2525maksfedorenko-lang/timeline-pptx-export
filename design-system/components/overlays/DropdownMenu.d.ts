import type { ReactNode } from "react"

/** Action / option menu. Items support icons, checks, badges, submenu chevrons and separators. */
export interface DropdownMenuEntry {
  label?: string
  value?: string
  icon?: ReactNode
  checked?: boolean
  disabled?: boolean
  badge?: string
  shortcut?: string
  submenu?: boolean
  separator?: boolean
}
export interface DropdownMenuProps {
  trigger: ReactNode
  items: DropdownMenuEntry[]
  label?: string
  align?: "start" | "end"
  /** "right" is what the collapsed sidebar uses */
  side?: "bottom" | "right"
  minWidth?: number
  defaultOpen?: boolean
  onSelect?: (value: string) => void
  style?: React.CSSProperties
}
export function DropdownMenu(props: DropdownMenuProps): JSX.Element
export function DropdownMenuItem(props: { item: DropdownMenuEntry; onSelect?: (value: string) => void }): JSX.Element
