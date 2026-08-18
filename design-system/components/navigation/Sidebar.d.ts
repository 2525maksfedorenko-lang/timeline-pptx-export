import type { HTMLAttributes, ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react"

/**
 * The product's primary navigation shell: dark navy rail, 18rem expanded / 3rem icon-collapsed.
 */
export interface SidebarProps extends HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean
  children?: ReactNode
}
export interface SidebarMenuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** sm 28px, default 32px, lg 48px (used by the workspace switcher and user row) */
  size?: "sm" | "default" | "lg"
  isActive?: boolean
  icon?: ReactNode
  trailing?: ReactNode
  children?: ReactNode
}
export function Sidebar(props: SidebarProps): JSX.Element
export function SidebarHeader(props: SidebarProps): JSX.Element
export function SidebarContent(props: SidebarProps): JSX.Element
export function SidebarFooter(props: SidebarProps): JSX.Element
export function SidebarGroup(props: SidebarProps): JSX.Element
export function SidebarGroupLabel(props: SidebarProps): JSX.Element
export function SidebarMenu(props: HTMLAttributes<HTMLUListElement>): JSX.Element
export function SidebarMenuItem(props: HTMLAttributes<HTMLLIElement>): JSX.Element
export function SidebarMenuButton(props: SidebarMenuButtonProps): JSX.Element
export function SidebarMenuSub(props: HTMLAttributes<HTMLUListElement>): JSX.Element
export function SidebarMenuSubButton(props: AnchorHTMLAttributes<HTMLAnchorElement> & { icon?: ReactNode; depth?: number }): JSX.Element
