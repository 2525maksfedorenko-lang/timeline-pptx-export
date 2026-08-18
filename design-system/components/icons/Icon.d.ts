import type { SVGProps } from "react"

/**
 * lucide icon renderer — the product's only icon system (lucide-react 0.436).
 * Requires the lucide UMD script on the page.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  /** kebab-case lucide name, e.g. "folder-kanban", "message-square" */
  name: string
  /** px; product uses 16 (default), 14 for dense rows, 20 for page-title icons */
  size?: number
  strokeWidth?: number
  color?: string
}
export function Icon(props: IconProps): JSX.Element
