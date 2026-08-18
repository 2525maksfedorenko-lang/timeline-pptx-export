import React from "react"

export function Dialog({ open = true, onOpenChange, children, style }) {
  if (!open) return null
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, ...style }}>
      <div onClick={() => onOpenChange && onOpenChange(false)} style={{ position: "absolute", inset: 0, background: "var(--overlay-scrim)" }} />
      <div role="dialog" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", display: "grid", gap: 16, width: "100%", maxWidth: 512, boxSizing: "border-box", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius-lg)", background: "hsl(var(--background))", padding: 24, boxShadow: "var(--shadow-lg)" }}>
        {children}
        <button type="button" onClick={() => onOpenChange && onOpenChange(false)} aria-label="Close"
          style={{ position: "absolute", right: 16, top: 16, border: "none", background: "transparent", opacity: 0.7, cursor: "pointer", padding: 0, color: "inherit" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}
export function DialogHeader({ style, children, ...rest }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6, color: "hsl(var(--foreground))", ...style }} {...rest}>{children}</div>
}
export function DialogTitle({ style, children, ...rest }) {
  return <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", lineHeight: 1, letterSpacing: "var(--tracking-tight)", ...style }} {...rest}>{children}</h2>
}
export function DialogDescription({ style, children, ...rest }) {
  return <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))", ...style }} {...rest}>{children}</p>
}
export function DialogFooter({ style, children, ...rest }) {
  return <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, ...style }} {...rest}>{children}</div>
}
