Use `Sidebar` as the app frame for any Coordinator screen. Composition order in the product: header (logo + collapse trigger) → Workspaces group with switcher → "Platform" nav group → footer (Appearance, Language, Admin, user, Help & Support).

```jsx
<Sidebar>
  <SidebarHeader><img src="assets/aicoo-logo-orbit-lightblue-text.svg" style={{ height: 32 }} /></SidebarHeader>
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg">Acme GmbH</SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    </SidebarGroup>
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem><SidebarMenuButton size="sm" isActive icon={<Icon name="layout-dashboard" />}>Dashboard</SidebarMenuButton></SidebarMenuItem>
        <SidebarMenuItem><SidebarMenuButton size="sm" icon={<Icon name="folder-kanban" />} trailing={<Icon name="chevron-right" size={14} />}>Projects</SidebarMenuButton></SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  </SidebarContent>
</Sidebar>
```

Notes
- Nav items are `size="sm"`; expandable ones carry a 14px `chevron-right` that rotates 90° when open.
- Sub-items are 13px; second-level sub-items drop to 12px at 80% opacity.
- Collapsed (`collapsed`) shows icons only at 3rem and moves each expandable item's children into a `DropdownMenu` opening `side="right"`.
- The sidebar keeps its dark navy palette in both themes — it does not follow `--background`.
