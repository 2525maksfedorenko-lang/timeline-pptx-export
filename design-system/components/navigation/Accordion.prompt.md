Use `Accordion` for stacked reference content (legal pages, settings explanations).

```jsx
<Accordion defaultOpenValue="a" items={[{ value: "a", title: "How are proposals generated?", content: "…" }]} />
```

Source values: item `border-b`; trigger `flex-1 py-4 font-medium hover:underline` with a 16px chevron that rotates 180° when open (200ms); content `text-sm` with `pb-4 pt-0`. The underline is a **hover** affordance, not an open-state style. Open/close is animated by the `accordion-down`/`accordion-up` keyframes at 200ms ease-out.
