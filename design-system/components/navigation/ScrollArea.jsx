import React from "react"

export function ScrollArea({ style, children, ...rest }) {
  return (
    <div className="ds-scroll-area" style={{ position: "relative", overflow: "auto", ...style }} {...rest}>
      <style>{".ds-scroll-area{scrollbar-width:thin;scrollbar-color:hsl(var(--border)) transparent}.ds-scroll-area::-webkit-scrollbar{width:10px;height:10px}.ds-scroll-area::-webkit-scrollbar-track{background:transparent}.ds-scroll-area::-webkit-scrollbar-thumb{background:hsl(var(--border));border-radius:9999px;border:1px solid transparent;background-clip:padding-box}"}</style>
      {children}
    </div>
  )
}
