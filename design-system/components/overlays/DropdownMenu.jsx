import React from "react"

export function DropdownMenu({ trigger, items = [], align = "start", side = "bottom", label, minWidth = 224, defaultOpen = false, onSelect, style }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div style={{ position: "relative", display: "inline-block", ...style }}>
      <span onClick={() => setOpen(!open)} style={{ display: "inline-flex" }}>{trigger}</span>
      {open ? (
        <div role="menu" style={{
          position: "absolute", zIndex: 50, minWidth,
          top: side === "bottom" ? "calc(100% + 4px)" : 0,
          left: side === "right" ? "calc(100% + 4px)" : (align === "start" ? 0 : undefined),
          right: align === "end" && side !== "right" ? 0 : undefined,
          overflow: "hidden", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))",
          background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))",
          padding: 4, boxShadow: "var(--shadow-md)",
        }}>
          {label ? <div style={{ padding: "6px 8px", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" }}>{label}</div> : null}
          {items.map((item, i) => item.separator
            ? <div key={"sep" + i} style={{ margin: "4px -4px", height: 1, background: "hsl(var(--muted))" }} />
            : <DropdownMenuItem key={item.value || item.label} item={item} onSelect={(v) => { setOpen(false); onSelect && onSelect(v) }} />)}
        </div>
      ) : null}
    </div>
  )
}

export function DropdownMenuItem({ item, onSelect }) {
  const [hover, setHover] = React.useState(false)
  const disabled = !!item.disabled
  return (
    <div role="menuitem" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => !disabled && onSelect && onSelect(item.value || item.label)}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 8,
        borderRadius: "var(--radius-sm)", padding: "6px 8px", fontSize: "var(--text-sm)",
        cursor: "default", userSelect: "none", opacity: disabled ? 0.5 : 1,
        background: hover && !disabled ? "hsl(var(--accent))" : "transparent",
        color: hover && !disabled ? "hsl(var(--accent-foreground))" : "inherit",
      }}>
      {item.checked ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg> : null}
      {item.icon ? <span style={{ display: "inline-flex" }}>{item.icon}</span> : null}
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
      {item.badge ? <span style={{ borderRadius: "var(--radius-sm)", background: "hsl(var(--muted))", padding: "2px 6px", fontSize: "var(--text-2xs)", fontWeight: "var(--font-weight-medium)", color: "hsl(var(--muted-foreground))" }}>{item.badge}</span> : null}
      {item.submenu ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg> : null}
      {item.shortcut ? <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-widest)", opacity: 0.6 }}>{item.shortcut}</span> : null}
    </div>
  )
}
