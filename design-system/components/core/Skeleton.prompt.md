Use `Skeleton` for loading states — never a spinner in lists.

```jsx
<Skeleton style={{ height: 128, width: "100%", borderRadius: "var(--radius-xl)" }} />
<Skeleton style={{ height: 16, width: "75%" }} />
```

Notes: channel grids render three 128px-tall xl-radius skeletons; wiki grids three 96px ones; tables one skeleton row of 16px bars.
