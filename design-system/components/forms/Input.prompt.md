Use `Input` for all single-line entry: login, search boxes, workspace name.

```jsx
<Input placeholder="Search channels" />
<Input invalid placeholder="Email" />
```

Notes
- Search fields put a 16px `search` lucide icon absolutely at left 12px and pad the input to 36px left.
- Error state in the product is literally a red border plus a `FormMessage` below.
