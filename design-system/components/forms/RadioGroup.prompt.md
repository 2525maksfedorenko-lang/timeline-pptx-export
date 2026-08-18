Use `RadioGroup` for mutually exclusive settings (view mode, proposal handling).

```jsx
<RadioGroup defaultValue="gantt">
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}><RadioGroupItem value="gantt" /><Label>Gantt</Label></div>
  <div style={{ display: "flex", gap: 8, alignItems: "center" }}><RadioGroupItem value="kanban" /><Label>Kanban</Label></div>
</RadioGroup>
```
