import React from "react"

export function Tooltip({ content, side = "top", children, style }) {
  const [open, setOpen] = React.useState(false)
  const pos = side === "right"
    ? { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" }
    : side === "bottom" ? { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
    : { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" }
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {children}
      {open ? (
        <span role="tooltip" style={{
          position: "absolute", zIndex: 50, whiteSpace: "nowrap", overflow: "hidden",
          borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))",
          background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))",
          padding: "6px 12px", fontSize: "var(--text-sm)", boxShadow: "var(--shadow-md)", ...pos,
        }}>{content}</span>
      ) : null}
    </span>
  )
}
