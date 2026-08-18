import type { TextareaHTMLAttributes } from "react"

/** Multi-line field, 80px minimum height. */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}
export function Textarea(props: TextareaProps): JSX.Element
