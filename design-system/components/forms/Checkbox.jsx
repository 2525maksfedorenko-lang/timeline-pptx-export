import React from "react"

export function Checkbox({ checked, defaultChecked, onCheckedChange, disabled, style, ...rest }) {
  const [internal, setInternal] = React.useState(!!defaultChecked)
  const isControlled = checked !== undefined
  const on = isControlled ? checked : internal
  return (
    <button
      type="button" role="checkbox" aria-checked={!!on} disabled={disabled}
      onClick={() => { if (!isControlled) setInternal(!on); onCheckedChange && onCheckedChange(!on) }}
      style={{
        height: 16, width: 16, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--radius-sm)", border: "1px solid hsl(var(--primary))",
        background: on ? "hsl(var(--primary))" : "transparent",
        color: "hsl(var(--primary-foreground))", padding: 0,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style,
      }}
      {...rest}
    >
      {on ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      ) : null}
    </button>
  )
}
