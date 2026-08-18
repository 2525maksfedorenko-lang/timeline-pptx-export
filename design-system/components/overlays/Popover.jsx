import React from "react"

export function Popover({ trigger, children, align = "center", width = 288, defaultOpen = false, style }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div style={{ position: "relative", display: "inline-block", ...style }}>
      <span onClick={() => setOpen(!open)} style={{ display: "inline-flex" }}>{trigger}</span>
      {open ? (
        <div role="dialog" style={{
          position: "absolute", zIndex: 50, top: "calc(100% + 4px)",
          left: align === "start" ? 0 : align === "center" ? "50%" : undefined,
          right: align === "end" ? 0 : undefined,
          transform: align === "center" ? "translateX(-50%)" : undefined,
          width, boxSizing: "border-box", borderRadius: "var(--radius-md)",
          border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))",
          color: "hsl(var(--popover-foreground))", padding: 16, boxShadow: "var(--shadow-md)",
        }}>{children}</div>
      ) : null}
    </div>
  )
}
