const {
  Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubButton,
  DropdownMenu, Button, Icon,
} = window.AicooCoordinatorDesignSystem_42e5f1;

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
  { key: "projects", label: "Projects", icon: "folder-kanban", expandable: true },
  { key: "channels", label: "Communication", icon: "message-square", expandable: true },
  { key: "wiki", label: "Wiki", icon: "book-open" },
  { key: "resources", label: "Resources", icon: "boxes" },
];

function AppShell({ onLogout }) {
  const [route, setRoute] = React.useState("dashboard");
  const [collapsed, setCollapsed] = React.useState(false);
  const [openProjects, setOpenProjects] = React.useState(true);
  const [openComms, setOpenComms] = React.useState(true);

  const screen = route === "projects" ? <ProjectPlanScreen />
    : route === "channels" ? <ChannelsScreen />
    : route === "wiki" ? <WikiScreen />
    : route === "resources" ? <EmptyScreen />
    : <DashboardScreen onOpenProject={() => setRoute("projects")} />;

  const title = route === "projects" ? "Rollout DACH"
    : route === "channels" ? "Communication channels"
    : route === "wiki" ? "Wiki"
    : route === "resources" ? "Resources" : "Dashboard";
  const titleIcon = route === "channels" ? "message-square" : route === "wiki" ? "book-open" : route === "resources" ? "boxes" : null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "hsl(var(--background))", fontFamily: "var(--font-sans)", color: "hsl(var(--foreground))" }}>
      <Sidebar collapsed={collapsed}>
        <SidebarHeader style={{ justifyContent: collapsed ? "center" : "space-between" }}>
          <img src={collapsed ? "../../assets/aicoo-logo-orbit-lightblue.svg" : "../../assets/aicoo-logo-orbit-lightblue-text.svg"} alt="aicoo Logo" style={{ height: 32, width: "auto", padding: 4 }} />
          {collapsed ? null : (
            <button type="button" onClick={() => setCollapsed(true)} aria-label="Toggle Sidebar"
              style={{ height: 28, width: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--sidebar-border) / 0.4)", background: "hsl(var(--sidebar-background))", color: "inherit", cursor: "pointer" }}>
              <Icon name="chevron-left" size={16} />
            </button>
          )}
        </SidebarHeader>
        {collapsed ? (
          <SidebarContent>
            <SidebarGroup>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setCollapsed(false)} icon={<Icon name="chevron-right" />}>Expand</SidebarMenuButton>
                </SidebarMenuItem>
                {NAV.map((n) => (
                  <SidebarMenuItem key={n.key}>
                    <SidebarMenuButton size="sm" isActive={route === n.key} icon={<Icon name={n.icon} />} onClick={() => setRoute(n.key)}>{n.label}</SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        ) : (
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu align="start" minWidth={224}
                    trigger={
                      <SidebarMenuButton size="lg"
                        icon={<span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 32, width: 32, borderRadius: "var(--radius-lg)", background: "#3b82f6", fontSize: 12, fontWeight: 600 }}>AG</span>}
                        trailing={<Icon name="chevrons-up-down" size={16} />}>
                        <span style={{ display: "grid", textAlign: "left", lineHeight: 1.25 }}>
                          <span style={{ fontWeight: 600 }}>Acme GmbH</span>
                          <span style={{ fontSize: "var(--text-xs)", opacity: 0.8 }}>Active</span>
                        </span>
                      </SidebarMenuButton>
                    }
                    items={[
                      { label: "Acme GmbH", value: "acme", checked: true },
                      { label: "Acme Logistics AT", value: "at" },
                      { separator: true },
                      { label: "Add workspace", value: "add", icon: <Icon name="plus" size={14} /> },
                    ]} />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarMenu>
                {NAV.map((n) => {
                  const open = n.key === "projects" ? openProjects : n.key === "channels" ? openComms : false;
                  const toggle = () => {
                    setRoute(n.key);
                    if (n.key === "projects") setOpenProjects(!openProjects);
                    if (n.key === "channels") setOpenComms(!openComms);
                  };
                  return (
                    <SidebarMenuItem key={n.key}>
                      <SidebarMenuButton size="sm" isActive={route === n.key} icon={<Icon name={n.icon} />}
                        onClick={toggle}
                        trailing={n.expandable ? <Icon name="chevron-right" size={14} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform var(--duration) var(--ease-out)", opacity: 0.6 }} /> : null}>
                        {n.label}
                      </SidebarMenuButton>
                      {n.key === "projects" && open ? (
                        <SidebarMenuSub>
                          {projects.slice(0, 3).map((p) => (
                            <li key={p.id}>
                              <SidebarMenuSubButton onClick={() => setRoute("projects")}>{p.title}</SidebarMenuSubButton>
                              {p.id === "p1" ? (
                                <SidebarMenuSub style={{ borderLeft: "1px solid hsl(var(--sidebar-border) / 0.6)" }}>
                                  <li><SidebarMenuSubButton depth={1} icon={<Icon name="calendar" size={14} />} onClick={() => setRoute("projects")}>Plan</SidebarMenuSubButton></li>
                                  <li><SidebarMenuSubButton depth={1} icon={<Icon name="book-open" size={14} />} onClick={() => setRoute("wiki")}>Wiki</SidebarMenuSubButton></li>
                                </SidebarMenuSub>
                              ) : null}
                            </li>
                          ))}
                        </SidebarMenuSub>
                      ) : null}
                      {n.key === "channels" && open ? (
                        <SidebarMenuSub>
                          <li><SidebarMenuSubButton icon={<Icon name="hash" size={14} />} onClick={() => setRoute("channels")}>Channels</SidebarMenuSubButton></li>
                        </SidebarMenuSub>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        )}

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu side="right" align="end" minWidth={192}
                trigger={<SidebarMenuButton icon={<Icon name="sun" />}>Appearance</SidebarMenuButton>}
                items={[{ label: "Light", value: "light", checked: true }, { label: "Dark", value: "dark" }, { label: "System", value: "system" }]} />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <DropdownMenu side="right" align="end" minWidth={192}
                trigger={<SidebarMenuButton icon={<Icon name="languages" />} trailing={<span style={{ fontSize: "var(--text-xs)", fontWeight: 500, textTransform: "uppercase", opacity: 0.7 }}>en</span>}>Language</SidebarMenuButton>}
                items={[{ label: "English", value: "en", checked: true }, { label: "German", value: "de" }]} />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <DropdownMenu side="right" align="end" minWidth={224}
                trigger={
                  <SidebarMenuButton size="lg" icon={<Icon name="user-circle" />} trailing={<Icon name="chevrons-up-down" size={16} />}>Maria Lang</SidebarMenuButton>
                }
                onSelect={(v) => { if (v === "logout") onLogout(); }}
                items={[{ label: "My profile", value: "profile", icon: <Icon name="settings" size={14} /> }, { label: "Log out", value: "logout", icon: <Icon name="log-out" size={14} /> }]} />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton icon={<Icon name="help-circle" />}>Help &amp; Support</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <main style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column", overflow: "hidden", background: "hsl(var(--background))" }}>
        <header style={{ flexShrink: 0, borderBottom: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}>
          <div style={{ display: "flex", minHeight: 48, alignItems: "center", gap: 12, padding: "8px 16px" }}>
            {titleIcon ? <Icon name={titleIcon} size={20} color="hsl(var(--muted-foreground))" /> : null}
            <h1 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h1>
            {route === "projects" ? (
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <Button variant="outline" size="sm"><Icon name="calendar" size={14} />Gantt</Button>
                <Button size="sm"><Icon name="plus" size={14} />New task</Button>
              </div>
            ) : null}
          </div>
        </header>
        <div style={{ minHeight: 0, flex: 1, overflow: "hidden" }}>{screen}</div>
      </main>
    </div>
  );
}

function EmptyScreen() {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))", padding: 32, textAlign: "center", fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))", maxWidth: 460 }}>
        Resource planning is not recreated in this UI kit — the source view is a 200k-line board that this kit intentionally leaves blank rather than approximate.
      </div>
    </div>
  );
}

Object.assign(window, { AppShell, EmptyScreen });
