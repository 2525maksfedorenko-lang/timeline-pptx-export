import React from "react"

export function Table({ style, children, ...rest }) {
  return (
    <div style={{ position: "relative", width: "100%", overflow: "auto" }}>
      <table style={{ width: "100%", captionSide: "bottom", borderCollapse: "collapse", fontSize: "var(--text-sm)", ...style }} {...rest}>{children}</table>
    </div>
  )
}
export function TableHeader({ children, ...rest }) { return <thead {...rest}>{children}</thead> }
export function TableBody({ children, ...rest }) { return <tbody {...rest}>{children}</tbody> }
export function TableFooter({ style, children, ...rest }) {
  return <tfoot style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.5)", fontWeight: "var(--font-weight-medium)", ...style }} {...rest}>{children}</tfoot>
}
export function TableRow({ clickable, style, children, ...rest }) {
  const [hover, setHover] = React.useState(false)
  return (
    <tr onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ borderBottom: "1px solid hsl(var(--border))", background: hover && clickable ? "hsl(var(--muted) / 0.5)" : "transparent", cursor: clickable ? "pointer" : "default", transition: "var(--transition-colors)", ...style }} {...rest}>{children}</tr>
  )
}
export function TableHead({ style, children, ...rest }) {
  return <th style={{ height: 48, padding: "0 16px", textAlign: "left", verticalAlign: "middle", fontWeight: "var(--font-weight-medium)", color: "hsl(var(--muted-foreground))", ...style }} {...rest}>{children}</th>
}
export function TableCell({ style, children, ...rest }) {
  return <td style={{ padding: 16, verticalAlign: "middle", ...style }} {...rest}>{children}</td>
}
export function TableCaption({ style, children, ...rest }) {
  return <caption style={{ marginTop: 16, fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))", ...style }} {...rest}>{children}</caption>
}
