import React from "react"

export function Switch({ checked, defaultChecked, onCheckedChange, disabled, style, ...rest }) {
  const [internal, setInternal] = React.useState(!!defaultChecked)
  const isControlled = checked !== undefined
  const on = isControlled ? checked : internal
  return (
    <button
      type="button" role="switch" aria-checked={!!on} disabled={disabled}
      onClick={() => { if (!isControlled) setInternal(!on); onCheckedChange && onCheckedChange(!on) }}
      style={{
        display: "inline-flex", alignItems: "center", height: 20, width: 36, flexShrink: 0,
        borderRadius: "var(--radius-full)", border: "2px solid transparent",
        boxShadow: "var(--shadow-sm)", padding: 0,
        background: on ? "hsl(var(--primary))" : "hsl(var(--input))",
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        transition: "var(--transition-colors)", ...style,
      }}
      {...rest}
    >
      <span style={{ display: "block", height: 16, width: 16, borderRadius: "var(--radius-full)", background: "hsl(var(--background))", boxShadow: "var(--shadow-lg)", transform: "translateX(" + (on ? 16 : 0) + "px)", transition: "transform var(--duration-fast) var(--ease-out)" }} />
    </button>
  )
}
