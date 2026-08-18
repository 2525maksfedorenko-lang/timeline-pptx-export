import type { ReactNode } from "react"

/** Searchable command palette / combobox list (cmdk in the product). */
export interface CommandEntry { value: string; label: string; shortcut?: string; icon?: ReactNode }
export interface CommandGroup { label?: string; items: CommandEntry[] }
export interface CommandProps {
  /** the product's own input placeholder is "Search..." */
  placeholder?: string
  groups: CommandGroup[]
  /** the product's own empty copy is "No results found." */
  emptyMessage?: string
  onSelect?: (value: string) => void
  style?: React.CSSProperties
}
export function Command(props: CommandProps): JSX.Element
export function CommandItem(props: { item: CommandEntry; onSelect?: (value: string) => void }): JSX.Element
