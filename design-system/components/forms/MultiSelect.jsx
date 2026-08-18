import React from "react"

const XCircle = ({ onClick }) => (
  <svg onClick={onClick} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8, flexShrink: 0, cursor: "pointer" }}>
    <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" />
  </svg>
)

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ margin: "0 8px", flexShrink: 0, color: "hsl(var(--muted-foreground))" }}><path d="m6 9 6 6 6-6" /></svg>
)

function CheckBox({ on }) {
  return (
    <span style={{ marginRight: 8, display: "inline-flex", height: 16, width: 16, alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", border: "1px solid hsl(var(--primary))", background: on ? "hsl(var(--primary))" : "transparent", color: "hsl(var(--primary-foreground))", opacity: on ? 1 : 0.5 }}>
      {on ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> : null}
    </span>
  )
}

function Row({ label, on, onClick }) {
  const [hover, setHover] = React.useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: "var(--radius-sm)", padding: "6px 8px", fontSize: "var(--text-sm)", cursor: "pointer", background: hover ? "hsl(var(--accent))" : "transparent", color: hover ? "hsl(var(--accent-foreground))" : "inherit" }}>
      <CheckBox on={on} /><span>{label}</span>
    </div>
  )
}

export function MultiSelect({ options = [], value, defaultValue = [], onValueChange, placeholder = "Select options", maxCount = 3, width, style }) {
  const [open, setOpen] = React.useState(false)
  const [internal, setInternal] = React.useState(defaultValue)
  const selected = value !== undefined ? value : internal
  const set = (next) => { if (value === undefined) setInternal(next); onValueChange && onValueChange(next) }
  const toggle = (v) => set(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
  const allOn = selected.length === options.length

  return (
    <div style={{ position: "relative", width: width || "100%", ...style }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ display: "flex", width: "100%", minHeight: 40, height: "auto", alignItems: "center", justifyContent: "space-between", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--input))", background: "inherit", padding: 4, cursor: "pointer", fontFamily: "var(--font-sans)", color: "inherit" }}>
        {selected.length > 0 ? (
          <span style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", overflow: "hidden" }}>
              {selected.slice(0, maxCount).map((v) => {
                const o = options.find((x) => x.value === v)
                return (
                  <span key={v} style={{ display: "inline-flex", alignItems: "center", margin: 4, maxWidth: 200, borderRadius: "var(--radius-full)", border: "1px solid hsl(var(--foreground) / 0.1)", background: "hsl(var(--card))", color: "hsl(var(--foreground))", padding: "2px 10px", fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o ? o.label : v}</span>
                    <XCircle onClick={(e) => { e.stopPropagation(); toggle(v) }} />
                  </span>
                )
              })}
              {selected.length > maxCount ? (
                <span style={{ display: "inline-flex", alignItems: "center", margin: 4, borderRadius: "var(--radius-full)", border: "1px solid hsl(var(--foreground) / 0.1)", background: "transparent", color: "hsl(var(--foreground))", padding: "2px 10px", fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-semibold)" }}>
                  {"+ " + (selected.length - maxCount) + " more"}
                  <XCircle onClick={(e) => { e.stopPropagation(); set(selected.slice(0, maxCount)) }} />
                </span>
              ) : null}
            </span>
            <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <svg onClick={(e) => { e.stopPropagation(); set([]) }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ margin: "0 8px", cursor: "pointer", color: "hsl(var(--muted-foreground))" }}><path d="M18 6 6 18M6 6l12 12" /></svg>
              <span style={{ display: "inline-block", width: 1, minHeight: 24, alignSelf: "stretch", background: "hsl(var(--border))" }} />
              <Chevron />
            </span>
          </span>
        ) : (
          <span style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ margin: "0 12px", fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>{placeholder}</span>
            <Chevron />
          </span>
        )}
      </button>

      {open ? (
        <div style={{ position: "absolute", zIndex: 50, top: "calc(100% + 4px)", left: 0, width: "auto", minWidth: "100%", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid hsl(var(--border))", padding: "0 12px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8, opacity: 0.5, flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input placeholder="Search..." style={{ height: 44, width: "100%", border: "none", background: "transparent", padding: "12px 0", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "inherit", outline: "none" }} />
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", padding: 4 }}>
            <Row label="(Select All)" on={allOn} onClick={() => set(allOn ? [] : options.map((o) => o.value))} />
            {options.map((o) => <Row key={o.value} label={o.label} on={selected.includes(o.value)} onClick={() => toggle(o.value)} />)}
          </div>
          <div style={{ borderTop: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", padding: 4 }}>
            {selected.length > 0 ? (
              <>
                <div onClick={() => set([])} style={{ flex: 1, textAlign: "center", borderRadius: "var(--radius-sm)", padding: "6px 8px", fontSize: "var(--text-sm)", cursor: "pointer" }}>Clear</div>
                <span style={{ width: 1, minHeight: 24, alignSelf: "stretch", background: "hsl(var(--border))" }} />
              </>
            ) : null}
            <div onClick={() => setOpen(false)} style={{ flex: 1, textAlign: "center", borderRadius: "var(--radius-sm)", padding: "6px 8px", fontSize: "var(--text-sm)", cursor: "pointer" }}>Close</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
