Use `NavigationMenu` for horizontal navigation. The product's primary navigation is the `Sidebar`, so this belongs in headers and secondary bars.

```jsx
<NavigationMenu activeValue="start" items={[{ value: "start", label: "Start" }, { value: "settings", label: "Settings" }]} />
```

Source values: trigger `h-10 w-max px-4 py-2 rounded-md bg-background text-sm font-medium`; hover and focus fill `--accent`; **active is `accent/50`**, as is an open submenu. Submenu triggers add a 12px chevron (`h-3 w-3`, `top-[1px] ml-1`) that rotates 180° when open. The dropdown viewport is `rounded-md border bg-popover shadow-lg` with a 6px top offset.
