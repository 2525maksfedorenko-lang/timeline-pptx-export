import React from "react"

export function Card({ style, children, ...rest }) {
  return (
    <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))", boxShadow: "var(--shadow-sm)", ...style }} {...rest}>{children}</div>
  )
}
export function CardHeader({ style, children, ...rest }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 24, ...style }} {...rest}>{children}</div>
}
export function CardTitle({ style, children, ...rest }) {
  return <h3 style={{ margin: 0, fontSize: "var(--text-2xl)", lineHeight: 1, fontWeight: "var(--font-weight-semibold)", letterSpacing: "var(--tracking-tight)", ...style }} {...rest}>{children}</h3>
}
export function CardDescription({ style, children, ...rest }) {
  return <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: "var(--leading-sm)", color: "hsl(var(--muted-foreground))", ...style }} {...rest}>{children}</p>
}
export function CardContent({ style, children, ...rest }) {
  return <div style={{ padding: "0 24px 24px", ...style }} {...rest}>{children}</div>
}
export function CardFooter({ style, children, ...rest }) {
  return <div style={{ display: "flex", alignItems: "center", padding: "0 24px 24px", ...style }} {...rest}>{children}</div>
}
