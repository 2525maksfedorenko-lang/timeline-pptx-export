import React from "react"

export function NavigationMenu({ items = [], activeValue, onSelect, style }) {
  return (
    <nav style={{ position: "relative", zIndex: 10, display: "flex", maxWidth: "max-content", alignItems: "center", justifyContent: "center", gap: 4, ...style }}>
      {items.map((item) => <NavigationMenuItem key={item.value} item={item} active={item.value === activeValue} onSelect={onSelect} />)}
    </nav>
  )
}

export function NavigationMenuItem({ item, active, onSelect }) {
  const [hover, setHover] = React.useState(false)
  const background = hover ? "hsl(var(--accent))" : active ? "hsl(var(--accent) / 0.5)" : "hsl(var(--background))"
  return (
    <button type="button" onClick={() => onSelect && onSelect(item.value)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        height: 40, width: "max-content", padding: "8px 16px",
        borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
        fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)",
        background, color: hover ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
        transition: "var(--transition-colors)",
      }}>
      {item.icon}{item.label}
      {item.submenu ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ position: "relative", top: 1, marginLeft: 4 }}><path d="m6 9 6 6 6-6" /></svg>
      ) : null}
    </button>
  )
}
