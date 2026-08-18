import type { ButtonHTMLAttributes, ReactNode } from "react"

/**
 * Primary action control. Six variants, four sizes — the product's only button.
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** default = dark navy fill, outline = muted-text bordered, ghost = bare */
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  /** default 40px, sm 36px, lg 44px, icon 40x40 square */
  size?: "default" | "sm" | "lg" | "icon"
  disabled?: boolean
  children?: ReactNode
}
export function Button(props: ButtonProps): JSX.Element
