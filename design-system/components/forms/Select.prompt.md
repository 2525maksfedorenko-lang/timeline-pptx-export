Use `Select` for filters and enum fields.

```jsx
<Select width={160} defaultValue="__all__" options={[
  { value: "__all__", label: "All sources" },
  { value: "slack_channel", label: "Slack" },
  { value: "email_address", label: "Email" },
]} />
```

Notes: filter selects in the product are fixed-width (160px source, 170px owner) and sit in a wrapping flex row with 8px gaps next to a search input and a `Tabs` status switch.
