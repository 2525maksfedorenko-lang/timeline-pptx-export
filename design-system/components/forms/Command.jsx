import React from "react"

export function Command({ placeholder = "Search...", groups = [], emptyMessage = "No results found.", onSelect, style }) {
  const [query, setQuery] = React.useState("")
  const q = query.trim().toLowerCase()
  const filtered = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !q || i.label.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length)
  return (
    <div style={{ display: "flex", height: "100%", width: "100%", flexDirection: "column", overflow: "hidden", borderRadius: "var(--radius-md)", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", ...style }}>
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid hsl(var(--border))", padding: "0 12px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 8, flexShrink: 0, opacity: 0.5 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder}
          style={{ display: "flex", height: 44, width: "100%", borderRadius: "var(--radius-md)", border: "none", background: "transparent", padding: "12px 0", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", color: "inherit", outline: "none" }} />
      </div>
      <div style={{ maxHeight: 300, overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", fontSize: "var(--text-sm)" }}>{emptyMessage}</div>
        ) : null}
        {filtered.map((g) => (
          <div key={g.label || "group"} style={{ overflow: "hidden", padding: 4, color: "hsl(var(--foreground))" }}>
            {g.label ? <div style={{ padding: "6px 8px", fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-medium)", color: "hsl(var(--muted-foreground))" }}>{g.label}</div> : null}
            {g.items.map((i) => <CommandItem key={i.value} item={i} onSelect={onSelect} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CommandItem({ item, onSelect }) {
  const [hover, setHover] = React.useState(false)
  return (
    <div role="option" aria-selected={hover}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onSelect && onSelect(item.value)}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 8,
        borderRadius: "var(--radius-sm)", padding: "6px 8px", fontSize: "var(--text-sm)",
        cursor: "default", userSelect: "none",
        background: hover ? "hsl(var(--accent))" : "transparent",
        color: hover ? "hsl(var(--accent-foreground))" : "inherit",
      }}>
      {item.icon}
      {item.label}
      {item.shortcut ? <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-widest)", color: "hsl(var(--muted-foreground))" }}>{item.shortcut}</span> : null}
    </div>
  )
}
