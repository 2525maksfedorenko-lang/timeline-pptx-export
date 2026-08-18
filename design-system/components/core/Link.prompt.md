Use `Link` for navigation inside prose and auth screens ("Forgot password?", "Sign up", legal footer links).

```jsx
<Link href="/signup">Sign up</Link>
```

Notes
- The product's Link is `text-blue-500 hover:underline` — **Tailwind blue-500 (#3b82f6), not `--primary`**. This is the one place a raw palette blue is used for text; keep it.
- Underline appears on hover only.
- Legal-footer links override the colour to `--muted-foreground` and go to `--foreground` on hover.
- In the product this wraps TanStack Router's `Link` and takes `to`, not `href`.
