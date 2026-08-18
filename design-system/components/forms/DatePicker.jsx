import React from "react"
import { Calendar } from "./Calendar.jsx"

/* "PPP" in date-fns => "September 30th, 2026" */
const ORD = (n) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const formatPPP = (d) => {
  const date = new Date(d)
  return MONTHS[date.getMonth()] + " " + ORD(date.getDate()) + ", " + date.getFullYear()
}

export function DatePicker({ value, defaultValue, onChange, placeholder = "Pick a date", style }) {
  const [open, setOpen] = React.useState(false)
  const [hover, setHover] = React.useState(false)
  const [internal, setInternal] = React.useState(defaultValue || null)
  const current = value !== undefined ? value : internal
  return (
    <div style={{ position: "relative", width: 240, ...style }}>
      <button type="button" onClick={() => setOpen(!open)}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display: "inline-flex", height: 40, width: "100%", alignItems: "center", justifyContent: "flex-start",
          gap: 0, borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--input))",
          background: hover ? "hsl(var(--accent))" : "hsl(var(--background))",
          color: current ? (hover ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))") : "hsl(var(--muted-foreground))",
          padding: "8px 16px", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
          fontWeight: "var(--font-weight-normal)", textAlign: "left", cursor: "pointer",
          transition: "var(--transition-colors)",
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, flexShrink: 0 }}>
          <path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
        </svg>
        {current ? formatPPP(current) : placeholder}
      </button>
      {open ? (
        <div style={{ position: "absolute", zIndex: 50, top: "calc(100% + 4px)", left: 0, width: "auto", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", boxShadow: "var(--shadow-md)" }}>
          <Calendar selected={current} onSelect={(d) => { if (value === undefined) setInternal(d); onChange && onChange(d); setOpen(false) }} />
        </div>
      ) : null}
    </div>
  )
}
