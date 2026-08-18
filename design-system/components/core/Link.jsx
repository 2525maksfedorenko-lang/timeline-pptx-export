import React from "react"

export function Link({ href = "#", style, children, ...rest }) {
  const [hover, setHover] = React.useState(false)
  return (
    <a href={href} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ color: "#3b82f6", fontSize: "var(--text-sm)", textDecoration: hover ? "underline" : "none", ...style }} {...rest}>
      {children}
    </a>
  )
}
