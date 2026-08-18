import React from "react"

const VARIANTS = {
  default: { bg: "hsl(var(--primary))", fg: "hsl(var(--primary-foreground))", hoverBg: "hsl(var(--primary) / 0.9)", border: "1px solid transparent" },
  destructive: { bg: "hsl(var(--destructive))", fg: "hsl(var(--destructive-foreground))", hoverBg: "hsl(var(--destructive) / 0.9)", border: "1px solid transparent" },
  outline: { bg: "hsl(var(--background))", fg: "hsl(var(--muted-foreground))", hoverBg: "hsl(var(--accent))", hoverFg: "hsl(var(--accent-foreground))", border: "1px solid hsl(var(--input))" },
  secondary: { bg: "hsl(var(--secondary))", fg: "hsl(var(--secondary-foreground))", hoverBg: "hsl(var(--secondary) / 0.8)", border: "1px solid transparent" },
  ghost: { bg: "transparent", fg: "inherit", hoverBg: "hsl(var(--accent))", hoverFg: "hsl(var(--accent-foreground))", border: "1px solid transparent" },
  link: { bg: "transparent", fg: "hsl(var(--primary))", hoverBg: "transparent", underline: true, border: "1px solid transparent" },
}

const SIZES = {
  default: { height: 40, padding: "8px 16px" },
  sm: { height: 36, padding: "0 12px" },
  lg: { height: 44, padding: "0 32px" },
  icon: { height: 40, width: 40, padding: 0 },
}

export function Button({ variant = "default", size = "default", disabled, style, children, ...rest }) {
  const [hover, setHover] = React.useState(false)
  const v = VARIANTS[variant] || VARIANTS.default
  const s = SIZES[size] || SIZES.default
  const on = hover && !disabled
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        whiteSpace: "nowrap", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)",
        fontSize: "var(--text-sm)", lineHeight: "var(--leading-sm)", fontWeight: "var(--font-weight-medium)",
        height: s.height, width: s.width, padding: s.padding, border: v.border,
        background: on && v.hoverBg ? v.hoverBg : v.bg,
        color: on && v.hoverFg ? v.hoverFg : v.fg,
        textDecoration: v.underline && on ? "underline" : "none",
        textUnderlineOffset: 4,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : undefined,
        transition: "var(--transition-colors)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
