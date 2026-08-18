import React from "react"

export function Sheet({ open = true, side = "right", width = 384, onOpenChange, children, style }) {
  if (!open) return null
  const horizontal = side === "left" || side === "right"
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, ...style }}>
      <div onClick={() => onOpenChange && onOpenChange(false)} style={{ position: "absolute", inset: 0, background: "var(--overlay-scrim)" }} />
      <div role="dialog" style={{
        position: "absolute",
        top: side === "bottom" ? undefined : 0,
        bottom: side === "top" ? undefined : 0,
        left: side === "right" ? undefined : 0,
        right: side === "left" ? undefined : 0,
        width: horizontal ? Math.min(width, 384) : "100%",
        maxWidth: horizontal ? 384 : undefined,
        height: horizontal ? "100%" : undefined,
        display: "flex", flexDirection: "column", gap: 16, boxSizing: "border-box",
        background: "hsl(var(--background))", padding: 24, boxShadow: "var(--shadow-lg)",
        borderLeft: side === "right" ? "1px solid hsl(var(--border))" : undefined,
        borderRight: side === "left" ? "1px solid hsl(var(--border))" : undefined,
        borderTop: side === "bottom" ? "1px solid hsl(var(--border))" : undefined,
        borderBottom: side === "top" ? "1px solid hsl(var(--border))" : undefined,
      }}>
        {children}
        <button type="button" onClick={() => onOpenChange && onOpenChange(false)} aria-label="Close"
          style={{ position: "absolute", right: 16, top: 16, border: "none", background: "transparent", borderRadius: "var(--radius-sm)", opacity: 0.7, cursor: "pointer", padding: 0, color: "inherit" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}
export function SheetHeader({ style, children, ...rest }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }} {...rest}>{children}</div>
}
export function SheetTitle({ style, children, ...rest }) {
  return <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", color: "hsl(var(--foreground))", ...style }} {...rest}>{children}</h2>
}
export function SheetDescription({ style, children, ...rest }) {
  return <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))", ...style }} {...rest}>{children}</p>
}
export function SheetFooter({ style, children, ...rest }) {
  return <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, ...style }} {...rest}>{children}</div>
}
