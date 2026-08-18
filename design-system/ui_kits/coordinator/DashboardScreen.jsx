const { Card, CardHeader, CardTitle, CardContent, Collapsible, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Progress, Button, DropdownMenu, Icon } = window.AicooCoordinatorDesignSystem_42e5f1;

const statusChip = (status) => status === "delayed"
  ? { background: "var(--status-delayed-bg)", color: "var(--status-delayed-fg)" }
  : { background: "var(--status-ontrack-bg)", color: "var(--status-ontrack-fg)" };

function DashboardScreen({ onOpenProject }) {
  const [page, setPage] = React.useState(1);
  return (
    <div style={{ height: "100%", minHeight: 0, width: "100%", overflowY: "auto", padding: 24, boxSizing: "border-box" }}>
      <Collapsible defaultOpen trigger={(open) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: "var(--font-weight-semibold)" }}>Key Performance Indicators</h2>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>
            {open ? "Hide" : "Show"}<Icon name="chevron-down" size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform var(--duration) var(--ease-out)" }} />
          </span>
        </div>
      )}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16, marginBottom: 32 }}>
          {kpis.map((k) => (
            <Card key={k.title}>
              <CardHeader style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "24px 24px 8px" }}>
                <CardTitle style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" }}>{k.title}</CardTitle>
                <Icon name={k.icon} color="hsl(var(--muted-foreground))" />
              </CardHeader>
              <CardContent>
                <div style={{ fontSize: "var(--text-2xl)", fontWeight: "var(--font-weight-bold)" }}>{k.value}</div>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))" }}>{k.explanation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Collapsible>

      <Card style={{ padding: 12, marginBottom: 24, borderStyle: "dashed", cursor: "pointer", boxShadow: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 24, width: 24, borderRadius: "var(--radius-full)", background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", flexShrink: 0 }}>
            <Icon name="plus" size={16} />
          </span>
          <span style={{ fontWeight: "var(--font-weight-medium)", fontSize: "var(--text-sm)" }}>Add project</span>
        </div>
      </Card>

      <div style={{ borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", padding: 8 }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project name</TableHead>
              <TableHead>Assistant active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id} clickable onClick={onOpenProject}>
                <TableCell style={{ maxWidth: 260 }}>{p.title}</TableCell>
                <TableCell>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ height: 8, width: 8, borderRadius: "var(--radius-full)", background: p.active ? "var(--status-active-dot)" : "var(--status-inactive-dot)" }} />
                    {p.active ? "Active" : "Inactive"}
                  </div>
                </TableCell>
                <TableCell>
                  <span style={{ padding: "4px 8px", fontSize: "var(--text-xs)", borderRadius: "var(--radius-md)", ...statusChip(p.status) }}>{p.status}</span>
                </TableCell>
                <TableCell>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="calendar" color="hsl(var(--muted-foreground))" />{p.due}
                  </div>
                </TableCell>
                <TableCell>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))", width: 40 }}>{p.progress}%</span>
                    <Progress value={p.progress} style={{ width: "60%", height: 8 }} />
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <DropdownMenu align="end" minWidth={200}
                      trigger={<Button variant="ghost" size="icon"><Icon name="ellipsis-vertical" /></Button>}
                      items={[
                        { label: "Open Project Plan", value: "plan", icon: <Icon name="calendar" size={14} /> },
                        { label: "Open Kanban Board", value: "kanban", icon: <Icon name="folder-kanban" size={14} /> },
                        { separator: true },
                        { label: "Edit", value: "edit", icon: <Icon name="pen-square" size={14} /> },
                        { label: "Delete", value: "delete", icon: <Icon name="trash-2" size={14} /> },
                      ]} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, marginTop: 24 }}>
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <span style={{ fontSize: "var(--text-sm)" }}>Page {page}</span>
        <Button onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
Object.assign(window, { DashboardScreen });
