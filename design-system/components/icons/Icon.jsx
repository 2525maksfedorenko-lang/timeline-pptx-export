import React from "react"

/* aicoo Coordinator uses lucide-react (v0.436) for every glyph in the product.
   This wrapper renders the same icon set from the lucide UMD build, which the host
   page must load: <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script> */

const pascal = (name) => String(name).split(/[-_ ]+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")

function childrenOf(node) {
  if (!node) return []
  // lucide UMD exposes icon nodes either as [["path",{…}], …] or as ["svg", attrs, children]
  return Array.isArray(node[0]) ? node : (node[2] || [])
}

function serialize(children) {
  return (children || []).map(([tag, attrs]) => {
    const a = Object.entries(attrs || {}).map(([k, v]) => k + '="' + v + '"').join(" ")
    return "<" + tag + " " + a + "/>"
  }).join("")
}

export function Icon({ name, size = 16, strokeWidth = 2, color = "currentColor", style, ...rest }) {
  const lucide = typeof window !== "undefined" ? window.lucide : null
  const node = lucide && lucide.icons ? lucide.icons[pascal(name)] : null
  const inner = serialize(childrenOf(node))
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style }}
      dangerouslySetInnerHTML={{ __html: inner }}
      {...rest}
    />
  )
}
