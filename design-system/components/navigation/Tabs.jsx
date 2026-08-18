import React from "react"

export function Tabs({ tabs = [], value, defaultValue, onValueChange, style, children }) {
  const [internal, setInternal] = React.useState(defaultValue || (tabs[0] && tabs[0].value))
  const current = value !== undefined ? value : internal
  const set = (v) => { if (value === undefined) setInternal(v); onValueChange && onValueChange(v) }
  return (
    <div style={style}>
      <div role="tablist" style={{ display: "inline-flex", height: 40, alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", background: "hsl(var(--muted))", padding: 4, color: "hsl(var(--muted-foreground))" }}>
        {tabs.map((t) => {
          const active = t.value === current
          return (
            <button key={t.value} role="tab" aria-selected={active} type="button" onClick={() => set(t.value)}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap",
                borderRadius: "var(--radius-sm)", border: "none", padding: "6px 12px",
                fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)",
                background: active ? "hsl(var(--background))" : "transparent",
                color: active ? "hsl(var(--foreground))" : "inherit",
                boxShadow: active ? "var(--shadow-sm)" : "none", cursor: "pointer",
                transition: "var(--transition-colors)",
              }}>{t.label}</button>
          )
        })}
      </div>
      {children ? <div style={{ marginTop: 8 }}>{children}</div> : null}
    </div>
  )
}
