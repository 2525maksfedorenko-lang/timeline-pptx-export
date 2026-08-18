import React from "react"

export function Progress({ value = 0, style, ...rest }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div role="progressbar" aria-valuenow={v} style={{ position: "relative", height: 16, width: "100%", overflow: "hidden", borderRadius: "var(--radius-full)", background: "hsl(var(--secondary))", ...style }} {...rest}>
      <div style={{ height: "100%", width: "100%", background: "hsl(var(--primary))", transform: "translateX(-" + (100 - v) + "%)", transition: "transform var(--duration) var(--ease-out)" }} />
    </div>
  )
}
