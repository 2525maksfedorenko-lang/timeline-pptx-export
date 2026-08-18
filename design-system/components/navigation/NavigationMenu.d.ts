import type { ReactNode } from "react"

/** Horizontal nav row. Triggers are 40px, 16px horizontal padding, 6px radius. */
export interface NavigationMenuEntry { value: string; label: string; icon?: ReactNode; submenu?: boolean }
export interface NavigationMenuProps {
  items: NavigationMenuEntry[]
  activeValue?: string
  onSelect?: (value: string) => void
  style?: React.CSSProperties
}
export function NavigationMenu(props: NavigationMenuProps): JSX.Element
export function NavigationMenuItem(props: { item: NavigationMenuEntry; active?: boolean; onSelect?: (value: string) => void }): JSX.Element
