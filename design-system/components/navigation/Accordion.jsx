import React from "react"

export function Accordion({ items = [], defaultOpenValue, style }) {
  const [open, setOpen] = React.useState(defaultOpenValue)
  return (
    <div style={style}>
      {items.map((item) => <AccordionItem key={item.value} item={item} isOpen={open === item.value} onToggle={() => setOpen(open === item.value ? null : item.value)} />)}
    </div>
  )
}

function AccordionItem({ item, isOpen, onToggle }) {
  const [hover, setHover] = React.useState(false)
  return (
    <div style={{ borderBottom: "1px solid hsl(var(--border))" }}>
      <div style={{ display: "flex" }}>
        <button type="button" onClick={onToggle}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          style={{
            display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", gap: 8,
            border: "none", background: "transparent", padding: "16px 0",
            fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)",
            color: "inherit", cursor: "pointer", textAlign: "left",
            textDecoration: hover ? "underline" : "none",
          }}>
          {item.title}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            style={{ flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform var(--duration) var(--ease-out)" }}><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
      {isOpen ? (
        <div style={{ overflow: "hidden", fontSize: "var(--text-sm)", lineHeight: "var(--leading-sm)" }}>
          <div style={{ paddingBottom: 16 }}>{item.content}</div>
        </div>
      ) : null}
    </div>
  )
}
