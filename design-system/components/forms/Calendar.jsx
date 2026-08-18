import React from "react"

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]

function Nav({ dir, onClick }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button type="button" onClick={onClick} aria-label={dir < 0 ? "Previous month" : "Next month"}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute", top: 4, left: dir < 0 ? 4 : undefined, right: dir > 0 ? 4 : undefined,
        height: 28, width: 28, display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--input))", background: "transparent",
        color: "hsl(var(--muted-foreground))", padding: 0, cursor: "pointer", opacity: hover ? 1 : 0.5,
        transition: "opacity var(--duration-fast) var(--ease-out)",
      }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir < 0 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </svg>
    </button>
  )
}

function Day({ day, selected, today, onSelect }) {
  const [hover, setHover] = React.useState(false)
  const background = selected ? "hsl(var(--primary))" : today ? "hsl(var(--accent))" : hover ? "hsl(var(--accent))" : "transparent"
  const color = selected ? "hsl(var(--primary-foreground))" : today || hover ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))"
  return (
    <button type="button" onClick={onSelect}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        height: 36, width: 36, padding: 0, border: "1px solid transparent", borderRadius: "var(--radius-md)",
        fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-normal)",
        background, color, cursor: "pointer", transition: "var(--transition-colors)",
      }}>{day}</button>
  )
}

export function Calendar({ month, selected, onSelect, style }) {
  const base = month ? new Date(month) : (selected ? new Date(selected) : new Date())
  const [view, setView] = React.useState(new Date(base.getFullYear(), base.getMonth(), 1))
  const startOffset = new Date(view.getFullYear(), view.getMonth(), 1).getDay()
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells = [...Array(startOffset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const sel = selected ? new Date(selected) : null
  const now = new Date()
  const same = (d, other) => other && other.getDate() === d && other.getMonth() === view.getMonth() && other.getFullYear() === view.getFullYear()

  return (
    <div style={{ padding: 12, fontFamily: "var(--font-sans)", ...style }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 4 }}>
          <Nav dir={-1} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" }}>{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
          <Nav dir={1} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} />
        </div>
        <div>
          <div style={{ display: "flex" }}>
            {DOW.map((d) => (
              <div key={d} style={{ width: 36, textAlign: "center", borderRadius: "var(--radius-md)", fontSize: "0.8rem", fontWeight: "var(--font-weight-normal)", color: "hsl(var(--muted-foreground))" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 36px)", marginTop: 8, rowGap: 8 }}>
            {cells.map((d, i) => d === null
              ? <div key={"e" + i} style={{ height: 36, width: 36 }} />
              : <Day key={d} day={d} selected={same(d, sel)} today={same(d, now)} onSelect={() => onSelect && onSelect(new Date(view.getFullYear(), view.getMonth(), d))} />)}
          </div>
        </div>
      </div>
    </div>
  )
}
