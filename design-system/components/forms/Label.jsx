import React from "react"

export function Label({ style, children, ...rest }) {
  return (
    <label style={{ fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)", lineHeight: 1, ...style }} {...rest}>{children}</label>
  )
}
