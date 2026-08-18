import React from "react"

export function Separator({ orientation = "horizontal", style, ...rest }) {
  const horizontal = orientation === "horizontal"
  return <div role="separator" aria-orientation={orientation} style={{ flexShrink: 0, background: "hsl(var(--border))", height: horizontal ? 1 : "100%", width: horizontal ? "100%" : 1, ...style }} {...rest} />
}
