const { Card, CardContent, Badge, Button, ScrollArea, ConfirmationPopover, Icon } = window.AicooCoordinatorDesignSystem_42e5f1;

function laneChip(type) {
  return { background: "var(--kanban-" + type + "-bg)", color: "var(--kanban-" + type + "-fg)", borderColor: "var(--kanban-" + type + "-border)" };
}

function TaskCard({ task, selected, onSelect }) {
  const [hover, setHover] = React.useState(false);
  const kindRing = task.kind === "phase" ? "var(--selection-ring-phase)" : "var(--selection-ring-task)";
  return (
    <Card
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onSelect}
      style={{
        width: "100%", cursor: "pointer", overflow: "hidden",
        background: hover ? "hsl(var(--muted) / 0.5)" : "hsl(var(--card))",
        boxShadow: selected ? kindRing : (hover ? "var(--shadow-md)" : "var(--shadow-sm)"),
        borderColor: selected ? (task.kind === "phase" ? "var(--kind-phase)" : "var(--kind-task)") : "hsl(var(--border))",
        opacity: task.proposed ? 0.5 : 1,
      }}>
      <CardContent style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 4, flex: 1, minWidth: 0 }}>
            <span style={{ opacity: hover ? 1 : 0.6, marginTop: 2, color: "hsl(var(--muted-foreground))" }}><Icon name="grip-vertical" size={14} /></span>
            {task.kind === "phase" ? <Icon name="milestone" size={16} color="var(--kind-phase)" style={{ marginTop: 2 }} /> : null}
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)", lineHeight: "var(--leading-sm)", overflowWrap: "anywhere" }}>{task.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {task.archived ? <Icon name="archive" size={16} color="hsl(var(--muted-foreground))" /> : null}
            {task.issues ? <Icon name="alert-circle" size={16} color="var(--status-issue)" /> : null}
            {task.subTasks ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 2, borderRadius: "var(--radius-sm)", background: "hsl(var(--muted))", padding: "1px 5px", fontSize: "var(--text-2xs)", fontWeight: 600, color: "hsl(var(--muted-foreground))" }}>
                <Icon name="folder-kanban" size={10} />{task.subTasks}
              </span>
            ) : null}
            {task.comments ? (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 16, height: 16, borderRadius: "var(--radius-full)", background: "#f59e0b", color: "#fff", padding: "0 3px" }}><Icon name="message-square" size={10} /></span>
            ) : null}
            {task.proposal === "update" ? (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 16, height: 16, borderRadius: "var(--radius-full)", background: "#ef4444", color: "#fff", padding: "0 3px" }}><Icon name="refresh-cw" size={10} /></span>
            ) : null}
            {task.proposed ? (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 16, height: 16, borderRadius: "var(--radius-full)", background: "var(--kind-project)", color: "#fff", padding: "0 3px" }}><Icon name="file-plus" size={10} /></span>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))" }}>
          <Icon name="calendar" size={12} />
          <span style={{ overflowWrap: "anywhere" }}>{task.dates}</span>
        </div>

        {task.assignees.length ? (
          <div style={{ display: "flex" }}>
            {task.assignees.slice(0, 3).map((a, i) => (
              <span key={i} style={{ height: 20, width: 20, marginLeft: i ? -4 : 0, borderRadius: "var(--radius-full)", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "1px solid hsl(var(--background))", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)" }}>{a}</span>
            ))}
            {task.assignees.length > 3 ? (
              <span style={{ height: 20, width: 20, marginLeft: -4, borderRadius: "var(--radius-full)", background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--background))", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xs)" }}>+{task.assignees.length - 3}</span>
            ) : null}
          </div>
        ) : null}

        {(task.misaligned || task.mails || task.proposed) ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {task.misaligned ? (
              <Badge variant="outline" style={{ fontSize: "var(--text-xs)", background: "var(--status-delayed-bg)", color: "var(--status-delayed-fg)", borderColor: "#fecaca" }}>
                <Icon name="alert-circle" size={12} />Misaligned
              </Badge>
            ) : null}
            {task.mails ? (
              <Badge variant="outline" style={{ fontSize: "var(--text-xs)", background: "var(--kanban-8-bg)", color: "var(--kanban-8-fg)", borderColor: "var(--kanban-8-border)", cursor: "pointer" }}>
                <Icon name="mail" size={12} />{task.mails} mails
              </Badge>
            ) : null}
            {task.proposed ? (
              <Badge variant="outline" style={{ fontSize: "var(--text-xs)", background: "var(--kanban-8-bg)", color: "var(--kanban-8-fg)", borderColor: "var(--kanban-8-border)" }}>Proposed</Badge>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ProjectPlanScreen() {
  const [selected, setSelected] = React.useState("t3");
  const [confirming, setConfirming] = React.useState(false);
  const [lanes, setLanes] = React.useState(board);

  const addTask = (laneId) => {
    setLanes(lanes.map((l) => l.id === laneId
      ? { ...l, tasks: [...l.tasks, { id: "n" + Math.random().toString(36).slice(2, 6), name: "New task", dates: "due Sep 12 '26", assignees: ["M"], kind: "task" }] }
      : l));
  };

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: "1px solid hsl(var(--border))", fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="folder-kanban" size={14} color="var(--kind-project)" />Rollout DACH</span>
        <Icon name="chevron-right" size={14} />
        <span>Kanban</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 8 }}>
          <Button variant="ghost" size="sm"><Icon name="users" size={14} />Resources</Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(!confirming)}><Icon name="pen-square" size={14} />Edit statuses</Button>
        </span>
      </div>

      <div style={{ display: "flex", minHeight: 0, flex: 1, overflowX: "auto" }}>
        {lanes.map((lane) => (
          <div key={lane.id} style={{ height: "100%", width: 288, flexShrink: 0 }}>
            <fieldset style={{ display: "flex", height: "100%", minHeight: 0, flexDirection: "column", margin: 0, padding: 0, border: "none", borderRight: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}>
              <div style={{ display: "flex", height: 44, flexShrink: 0, alignItems: "center", borderBottom: "1px solid hsl(var(--border))", padding: "0 12px", gap: 8 }}>
                <span style={{ color: "hsl(var(--muted-foreground))", display: "inline-flex", cursor: "grab" }}><Icon name="grip-vertical" size={16} /></span>
                <span style={{ flex: 1, minWidth: 0, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" }}>{lane.display}</span>
                <Button variant="ghost" size="icon" style={{ height: 28, width: 28 }}><Icon name="pen-square" size={16} /></Button>
                <Badge variant="secondary" style={{ fontSize: "var(--text-xs)", border: "1px solid", ...laneChip(lane.type) }}>{lane.tasks.length}</Badge>
              </div>
              <ScrollArea style={{ minHeight: 0, flex: 1, padding: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {lane.tasks.map((t, i) => (
                    <React.Fragment key={t.id}>
                      {t.archived && !lane.tasks[i - 1]?.archived ? (
                        <div style={{ borderTop: "1px solid hsl(var(--border) / 0.7)", paddingTop: 4, fontSize: "var(--text-xs)", fontWeight: 500, color: "hsl(var(--muted-foreground))" }}>Archived</div>
                      ) : null}
                      <TaskCard task={t} selected={selected === t.id} onSelect={() => setSelected(t.id)} />
                    </React.Fragment>
                  ))}
                  {lane.tasks.length === 0 ? (
                    <div style={{ padding: "16px 0", textAlign: "center", fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>No tasks</div>
                  ) : null}
                </div>
              </ScrollArea>
              <div style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--background))", padding: 12 }}>
                <Button variant="outline" style={{ width: "100%" }} onClick={() => addTask(lane.id)}><Icon name="plus" size={14} />Add task</Button>
              </div>
            </fieldset>
          </div>
        ))}
      </div>

      <ConfirmationPopover open={confirming} title="Edit task" prompt="Delete this status column?" onCancel={() => setConfirming(false)} onConfirm={() => setConfirming(false)} />
    </div>
  );
}
Object.assign(window, { ProjectPlanScreen });
