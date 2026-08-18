import React from "react"

export function Input({ style, invalid, ...rest }) {
  return (
    <input
      style={{
        display: "flex", height: 40, width: "100%", boxSizing: "border-box",
        borderRadius: "var(--radius-md)",
        border: "1px solid " + (invalid ? "hsl(var(--destructive))" : "hsl(var(--input))"),
        background: "hsl(var(--background))", color: "hsl(var(--foreground))",
        padding: "8px 12px", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)",
        lineHeight: "var(--leading-sm)", outline: "none", ...style,
      }}
      {...rest}
    />
  )
}
