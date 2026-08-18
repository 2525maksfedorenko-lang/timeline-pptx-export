const { Button, Input, Select, Tabs, Badge, Sheet, SheetHeader, SheetTitle, SheetDescription, Separator, Switch, Label, Icon } = window.AicooCoordinatorDesignSystem_42e5f1;

const SOURCE = {
  slack: { icon: "hash", bg: "var(--source-slack-bg)", fg: "var(--source-slack-fg)" },
  email: { icon: "mail", bg: "var(--source-email-bg)", fg: "var(--source-email-fg)" },
  sembly: { icon: "mic-2", bg: "var(--source-sembly-bg)", fg: "var(--source-sembly-fg)" },
  recording: { icon: "mic-2", bg: "var(--source-recording-bg)", fg: "var(--source-recording-fg)" },
  chat: { icon: "message-square", bg: "var(--source-chat-bg)", fg: "var(--source-chat-fg)" },
};

function ChannelCard({ channel, selected, onOpen }) {
  const [hover, setHover] = React.useState(false);
  const s = SOURCE[channel.source] || { icon: "plug", bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" };
  return (
    <button type="button" onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", flexDirection: "column", gap: 12, borderRadius: "var(--radius-xl)",
        border: "1px solid " + (selected ? "hsl(var(--primary))" : "hsl(var(--border))"),
        background: "hsl(var(--card))", padding: 14, textAlign: "left", cursor: "pointer",
        boxShadow: selected ? "0 0 0 2px hsl(var(--primary) / 0.2)" : (hover ? "var(--shadow-md)" : "none"),
        transition: "box-shadow var(--duration-fast) var(--ease-out)", font: "inherit", color: "inherit",
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ display: "inline-flex", height: 36, width: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-lg)", background: s.bg, color: s.fg }}>
          <Icon name={s.icon} />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{channel.name}</span>
            {channel.owner ? null : <Badge variant="outline" style={{ fontSize: "var(--text-2xs)", fontWeight: 500, color: "hsl(var(--muted-foreground))" }}>Shared with you</Badge>}
          </span>
          <span style={{ display: "block", fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{channel.sourceLabel}</span>
        </span>
      </div>
      <Separator />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {channel.owner ? (
          <span style={{ display: "inline-flex", height: 20, width: 32, alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-full)", background: "hsl(var(--primary) / 0.1)", fontSize: "var(--text-2xs)", fontWeight: 600, color: "hsl(var(--primary))" }}>You</span>
        ) : (
          <span style={{ fontSize: "var(--text-xs)" }}>{channel.ownerName}</span>
        )}
        <span style={{ display: "flex", flexShrink: 0, alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))" }}><Icon name="users" size={14} />{channel.members}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))" }}><Icon name="folder-kanban" size={14} />{channel.projects}</span>
          {channel.archived ? (
            <Badge variant="outline" style={{ fontSize: "var(--text-2xs)" }}>Archived</Badge>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: "var(--radius-full)", background: "var(--badge-live-bg)", color: "var(--badge-live-fg)", padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
              <span style={{ height: 6, width: 6, borderRadius: "var(--radius-full)", background: "var(--badge-live-dot)" }} />Active
            </span>
          )}
        </span>
      </div>
    </button>
  );
}

function ChannelsScreen() {
  const [search, setSearch] = React.useState("");
  const [groupBy, setGroupBy] = React.useState("project");
  const [selected, setSelected] = React.useState(null);
  const [status, setStatus] = React.useState("active");

  const visible = channels.filter((c) =>
    (status === "archived" ? c.archived : !c.archived) &&
    (!search || c.name.toLowerCase().includes(search.toLowerCase())));

  const groups = groupBy === "none"
    ? [{ label: "", items: visible }]
    : Object.entries(visible.reduce((acc, c) => {
        const key = groupBy === "project" ? c.group : groupBy === "source" ? c.source : (c.owner ? "You" : c.ownerName);
        acc[key] = [...(acc[key] || []), c];
        return acc;
      }, {})).map(([label, items]) => ({ label, items }));

  const selectedChannel = channels.find((c) => c.id === selected);

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 0, overflowY: "auto" }}>
      <div style={{ margin: "0 auto", display: "flex", width: "100%", maxWidth: "var(--content-max)", flexDirection: "column", gap: 20, padding: 24, boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>
            Channels route Slack, email, meetings and recordings into the work items they belong to.
          </p>
          <Button><Icon name="plus" size={16} />New channel</Button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", minWidth: 220, maxWidth: 320, flex: 1 }}>
            <span style={{ position: "absolute", left: 12, top: 12, color: "hsl(var(--muted-foreground))", pointerEvents: "none" }}><Icon name="search" /></span>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search channels" style={{ paddingLeft: 36 }} />
          </div>
          <Select width={160} defaultValue="all" options={[{ value: "all", label: "All sources" }, { value: "slack_channel", label: "Slack" }, { value: "email_address", label: "Email" }, { value: "sembly_sink", label: "Sembly" }, { value: "internal_chat", label: "Chat" }, { value: "internal_recording", label: "Recording" }]} />
          <Select width={170} defaultValue="all" options={[{ value: "all", label: "All owners" }, { value: "owned", label: "Owned by me" }, { value: "shared", label: "Shared with me" }]} />
          <Tabs value={status} onValueChange={setStatus} tabs={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, borderTop: "1px solid hsl(var(--border))", paddingTop: 16 }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)", color: "hsl(var(--muted-foreground))" }}>Group by</span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 2, borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.6)", padding: 2 }}>
            {["none", "project", "source", "owner"].map((o) => (
              <button key={o} type="button" onClick={() => setGroupBy(o)}
                style={{
                  borderRadius: "var(--radius-md)", border: "none", padding: "6px 12px",
                  fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)", cursor: "pointer",
                  background: groupBy === o ? "hsl(var(--background))" : "transparent",
                  color: groupBy === o ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                  boxShadow: groupBy === o ? "var(--shadow-sm)" : "none",
                }}>{o === "none" ? "None" : o.charAt(0).toUpperCase() + o.slice(1)}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, borderRadius: "var(--radius-lg)", border: "1px solid hsl(var(--border))", padding: 16 }}>
          <h2 style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" }}>Workspace sharing defaults</h2>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <Label style={{ color: "hsl(var(--muted-foreground))", fontWeight: 400 }}>Share new channels with the whole workspace</Label>
            <Switch defaultChecked />
          </div>
        </div>

        {visible.length === 0 ? (
          <div style={{ borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))", padding: 32, textAlign: "center", fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>
            No channels match this filter.
          </div>
        ) : null}

        {groups.map((g) => (
          <div key={g.label || "all"} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {g.label ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)" }}>{g.label}</span>
                <span style={{ display: "inline-flex", minWidth: 20, alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-full)", background: "hsl(var(--muted))", padding: "0 6px", fontSize: "var(--text-xs)", fontWeight: 600, color: "hsl(var(--muted-foreground))" }}>{g.items.length}</span>
                <span style={{ height: 1, flex: 1, background: "hsl(var(--border))" }} />
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
              {g.items.map((c) => <ChannelCard key={g.label + c.id} channel={c} selected={selected === c.id} onOpen={() => setSelected(c.id)} />)}
            </div>
          </div>
        ))}

        <Button variant="outline" style={{ width: "fit-content" }}>Load More</Button>
      </div>

      {selectedChannel ? (
        <Sheet open side="right" width={420} onOpenChange={() => setSelected(null)}>
          <SheetHeader>
            <SheetTitle>{selectedChannel.name}</SheetTitle>
            <SheetDescription>{selectedChannel.sourceLabel}</SheetDescription>
          </SheetHeader>
          <Separator />
          <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: "var(--text-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "hsl(var(--muted-foreground))" }}>Members</span><span>{selectedChannel.members}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "hsl(var(--muted-foreground))" }}>Routed projects</span><span>{selectedChannel.projects}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "hsl(var(--muted-foreground))" }}>Owner</span><span>{selectedChannel.owner ? "You" : selectedChannel.ownerName}</span></div>
            <Separator />
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" size="sm">Edit sources</Button>
              <Button variant="outline" size="sm">Members</Button>
              <Button variant="outline" size="sm">Merge</Button>
            </div>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
Object.assign(window, { ChannelsScreen });
