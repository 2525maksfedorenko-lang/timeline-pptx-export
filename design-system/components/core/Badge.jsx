import React from "react"

const VARIANTS = {
  default: { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderColor: "transparent" },
  secondary: { background: "hsl(var(--secondary))", color: "hsl(var(--secondary-foreground))", borderColor: "transparent" },
  destructive: { background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))", borderColor: "transparent" },
  outline: { background: "transparent", color: "hsl(var(--foreground))", borderColor: "hsl(var(--border))" },
}

export function Badge({ variant = "default", style, children, ...rest }) {
  const v = VARIANTS[variant] || VARIANTS.default
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        borderRadius: "var(--radius-full)", border: "1px solid " + v.borderColor,
        padding: "2px 10px", fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)", lineHeight: "var(--leading-xs)",
        fontWeight: "var(--font-weight-semibold)",
        background: v.background, color: v.color,
        transition: "var(--transition-colors)", ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
