import React from "react"

export function Textarea({ style, ...rest }) {
  return (
    <textarea
      style={{
        display: "flex", minHeight: 80, width: "100%", boxSizing: "border-box",
        borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--input))",
        background: "hsl(var(--background))", color: "hsl(var(--foreground))",
        padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
        lineHeight: "var(--leading-sm)", outline: "none", resize: "vertical", ...style,
      }}
      {...rest}
    />
  )
}
