import React from "react"

export function Skeleton({ style, ...rest }) {
  return (
    <div style={{ borderRadius: "var(--radius-md)", background: "hsl(var(--muted))", animation: "ds-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite", ...style }} {...rest}>
      <style>{"@keyframes ds-pulse{0%,100%{opacity:1}50%{opacity:.5}}"}</style>
    </div>
  )
}
