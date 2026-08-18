import type { HTMLAttributes, FormHTMLAttributes, ReactNode } from "react"

/** Form field layout parts. In the product these wrap react-hook-form; here they are pure layout. */
export interface FormPartProps extends HTMLAttributes<HTMLDivElement> { children?: ReactNode }
export function Form(props: FormHTMLAttributes<HTMLFormElement>): JSX.Element
export function FormItem(props: FormPartProps): JSX.Element
export function FormLabel(props: HTMLAttributes<HTMLLabelElement> & { invalid?: boolean }): JSX.Element
export function FormControl(props: FormPartProps): JSX.Element
export function FormDescription(props: HTMLAttributes<HTMLParagraphElement>): JSX.Element
export function FormMessage(props: HTMLAttributes<HTMLParagraphElement>): JSX.Element
