import React from "react"

const Ctx = React.createContext(null)

export function RadioGroup({ value, defaultValue, onValueChange, style, children, ...rest }) {
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value !== undefined ? value : internal
  const set = (v) => { if (value === undefined) setInternal(v); onValueChange && onValueChange(v) }
  return (
    <Ctx.Provider value={{ current, set }}>
      <div role="radiogroup" style={{ display: "grid", gap: 8, ...style }} {...rest}>{children}</div>
    </Ctx.Provider>
  )
}

export function RadioGroupItem({ value, disabled, style, ...rest }) {
  const ctx = React.useContext(Ctx)
  const on = ctx && ctx.current === value
  return (
    <button
      type="button" role="radio" aria-checked={!!on} disabled={disabled}
      onClick={() => ctx && ctx.set(value)}
      style={{
        height: 16, width: 16, aspectRatio: "1 / 1", display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--radius-full)", border: "1px solid hsl(var(--primary))",
        background: "transparent", color: "hsl(var(--primary))", padding: 0,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style,
      }}
      {...rest}
    >
      {on ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg> : null}
    </button>
  )
}
