import React from "react"

export function Sidebar({ collapsed = false, style, children, ...rest }) {
  return (
    <div data-state={collapsed ? "collapsed" : "expanded"}
      style={{
        display: "flex", flexDirection: "column", height: "100%",
        width: collapsed ? "var(--sidebar-width-icon)" : "var(--sidebar-width)",
        flexShrink: 0, background: "hsl(var(--sidebar-background))",
        color: "hsl(var(--sidebar-foreground))",
        borderRight: "1px solid hsl(var(--sidebar-border))",
        transition: "var(--sidebar-transition)", overflow: "hidden", ...style,
      }} {...rest}>{children}</div>
  )
}
export function SidebarHeader({ style, children, ...rest }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 8, height: 48, padding: "0 8px", ...style }} {...rest}>{children}</div>
}
export function SidebarContent({ style, children, ...rest }) {
  return <div style={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column", gap: 8, overflowY: "auto", paddingTop: 8, ...style }} {...rest}>{children}</div>
}
export function SidebarFooter({ style, children, ...rest }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8, ...style }} {...rest}>{children}</div>
}
export function SidebarGroup({ style, children, ...rest }) {
  return <div style={{ position: "relative", display: "flex", width: "100%", minWidth: 0, flexDirection: "column", padding: 8, ...style }} {...rest}>{children}</div>
}
export function SidebarGroupLabel({ style, children, ...rest }) {
  return <div style={{ display: "flex", height: 32, alignItems: "center", borderRadius: "var(--radius-md)", padding: "0 8px", fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-medium)", color: "hsl(var(--sidebar-foreground) / 0.7)", ...style }} {...rest}>{children}</div>
}
export function SidebarMenu({ style, children, ...rest }) {
  return <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", width: "100%", minWidth: 0, flexDirection: "column", gap: 6, ...style }} {...rest}>{children}</ul>
}
export function SidebarMenuItem({ style, children, ...rest }) {
  return <li style={{ position: "relative", ...style }} {...rest}>{children}</li>
}
export function SidebarMenuButton({ size = "default", isActive = false, icon, trailing, style, children, ...rest }) {
  const [hover, setHover] = React.useState(false)
  const heights = { sm: 28, default: 32, lg: 48 }
  const on = hover || isActive
  return (
    <button type="button" data-active={isActive}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", width: "100%", alignItems: "center", gap: 8, overflow: "hidden",
        borderRadius: "var(--radius-md)", border: "none", padding: 8, textAlign: "left",
        height: heights[size] || heights.default,
        fontFamily: "var(--font-sans)", fontSize: size === "sm" ? "var(--text-xs)" : "var(--text-sm)",
        fontWeight: isActive ? "var(--font-weight-medium)" : "var(--font-weight-normal)",
        background: on ? "hsl(var(--sidebar-accent))" : "transparent",
        color: "hsl(var(--sidebar-accent-foreground))", cursor: "pointer",
        transition: "var(--transition-colors)", ...style,
      }} {...rest}>
      {icon}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
      {trailing}
    </button>
  )
}
export function SidebarMenuSub({ style, children, ...rest }) {
  return <ul style={{ listStyle: "none", margin: "0 4px", padding: "2px 6px", display: "flex", minWidth: 0, flexDirection: "column", gap: 4, ...style }} {...rest}>{children}</ul>
}
export function SidebarMenuSubButton({ icon, depth = 0, style, children, ...rest }) {
  const [hover, setHover] = React.useState(false)
  return (
    <a onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", minHeight: depth ? 28 : 32, alignItems: "center", gap: 8, overflow: "hidden",
        borderRadius: "var(--radius-md)", padding: depth ? "4px 8px" : "6px 8px",
        fontSize: depth ? "var(--text-xs)" : "var(--text-13)", textDecoration: "none",
        color: depth ? "hsl(var(--sidebar-foreground) / 0.8)" : "hsl(var(--sidebar-foreground))",
        background: hover ? "hsl(var(--sidebar-accent))" : "transparent", cursor: "pointer",
        transition: "var(--transition-colors)", ...style,
      }} {...rest}>
      {icon}<span style={{ flex: 1 }}>{children}</span>
    </a>
  )
}
