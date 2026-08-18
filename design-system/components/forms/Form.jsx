import React from "react"

/* In the product `Form` IS react-hook-form's FormProvider — it renders no element.
   Here it renders the <form> the login/settings screens wrap around their fields,
   with the 24px field rhythm those screens use (space-y-6). */
export function Form({ style, children, ...rest }) {
  return <form style={{ display: "flex", flexDirection: "column", gap: 24, ...style }} {...rest}>{children}</form>
}
export function FormItem({ style, children, ...rest }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative", ...style }} {...rest}>{children}</div>
}
export function FormLabel({ invalid, style, children, ...rest }) {
  return <label style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)", lineHeight: 1, color: invalid ? "hsl(var(--destructive))" : "hsl(var(--foreground))", ...style }} {...rest}>{children}</label>
}
export function FormControl({ style, children, ...rest }) {
  return <div style={{ position: "relative", ...style }} {...rest}>{children}</div>
}
export function FormDescription({ style, children, ...rest }) {
  return <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))", ...style }} {...rest}>{children}</p>
}
export function FormMessage({ style, children, ...rest }) {
  if (!children) return null
  return <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)", color: "hsl(var(--destructive))", ...style }} {...rest}>{children}</p>
}
