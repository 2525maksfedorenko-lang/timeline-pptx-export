import React from "react"

export function AlertDialog({ open = true, title, description, confirmLabel = "Ok", cancelLabel = "Cancel", onConfirm, onCancel, destructive = false, style }) {
  if (!open) return null
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, ...style }}>
      <div onClick={onCancel} style={{ position: "absolute", inset: 0, background: "var(--overlay-scrim)" }} />
      <div role="alertdialog" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", display: "grid", gap: 16, width: "100%", maxWidth: 512, boxSizing: "border-box", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius-lg)", background: "hsl(var(--background))", padding: 24, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", color: "hsl(var(--foreground))" }}>{title}</h2>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>{description}</p>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onCancel} style={{ height: 40, padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--input))", background: "hsl(var(--background))", color: "hsl(var(--muted-foreground))", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)", cursor: "pointer" }}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} style={{ height: 40, padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid transparent", background: destructive ? "hsl(var(--destructive))" : "hsl(var(--primary))", color: destructive ? "hsl(var(--destructive-foreground))" : "hsl(var(--primary-foreground))", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)", cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
