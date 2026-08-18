import React from "react"

export function Select({ value, defaultValue, onValueChange, options = [], placeholder = "Select…", disabled, width, style, ...rest }) {
  const [open, setOpen] = React.useState(false)
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value !== undefined ? value : internal
  const selected = options.find((o) => o.value === current)
  const pick = (v) => { if (value === undefined) setInternal(v); onValueChange && onValueChange(v); setOpen(false) }
  return (
    <div style={{ position: "relative", width: width || "100%", ...style }} {...rest}>
      <button
        type="button" disabled={disabled} onClick={() => setOpen(!open)}
        style={{
          display: "flex", height: 40, width: "100%", alignItems: "center", justifyContent: "space-between", gap: 8,
          borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--input))", background: "hsl(var(--background))",
          padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
          color: selected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, textAlign: "left",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected ? selected.label : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.5 }}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open ? (
        <div style={{ position: "absolute", zIndex: 50, top: 44, left: 0, minWidth: "100%", maxHeight: 384, overflow: "auto", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", boxShadow: "var(--shadow-md)", padding: 4 }}>
          {options.map((o) => (
            <SelectItem key={o.value} label={o.label} selected={o.value === current} onSelect={() => pick(o.value)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function SelectItem({ label, selected, onSelect }) {
  const [hover, setHover] = React.useState(false)
  return (
    <div
      role="option" aria-selected={!!selected} onClick={onSelect}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", display: "flex", alignItems: "center", width: "100%",
        borderRadius: "var(--radius-sm)", padding: "6px 8px 6px 32px",
        fontSize: "var(--text-sm)", cursor: "default", userSelect: "none",
        background: hover ? "hsl(var(--accent))" : "transparent",
        color: hover ? "hsl(var(--accent-foreground))" : "inherit",
      }}
    >
      <span style={{ position: "absolute", left: 8, display: "inline-flex", height: 14, width: 14, alignItems: "center", justifyContent: "center" }}>
        {selected ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> : null}
      </span>
      {label}
    </div>
  )
}
