import React from "react"

export function Collapsible({ trigger, defaultOpen = false, open: openProp, onOpenChange, children, style }) {
  const [internal, setInternal] = React.useState(defaultOpen)
  const open = openProp !== undefined ? openProp : internal
  const toggle = () => { if (openProp === undefined) setInternal(!open); onOpenChange && onOpenChange(!open) }
  return (
    <div style={style}>
      <div onClick={toggle} style={{ cursor: "pointer" }}>
        {typeof trigger === "function" ? trigger(open) : trigger}
      </div>
      {open ? <div>{children}</div> : null}
    </div>
  )
}
