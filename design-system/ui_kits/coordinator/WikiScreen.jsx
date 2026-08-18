const { Button, Input, Tabs, Badge, Separator, Sheet, SheetHeader, SheetTitle, SheetDescription, Skeleton, Icon } = window.AicooCoordinatorDesignSystem_42e5f1;

function WikiCard({ wiki, selected, onOpen }) {
  const [hover, setHover] = React.useState(false);
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
        <span style={{ display: "inline-flex", height: 36, width: 36, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-lg)", background: "var(--source-wiki-bg)", color: "var(--source-wiki-fg)" }}>
          <Icon name="book-open" />
        </span>
        <span style={{ minWidth: 0, flex: 1, fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-semibold)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{wiki.title}</span>
      </div>
      <Separator />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-xs)", color: "hsl(var(--muted-foreground))" }}><Icon name="folder-kanban" size={14} />{wiki.linked}</span>
        {wiki.archived ? (
          <Badge variant="outline" style={{ fontSize: "var(--text-2xs)" }}>Archived</Badge>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: "var(--radius-full)", background: "var(--badge-live-bg)", color: "var(--badge-live-fg)", padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
            <span style={{ height: 6, width: 6, borderRadius: "var(--radius-full)", background: "var(--badge-live-dot)" }} />Active
          </span>
        )}
      </div>
    </button>
  );
}

function WikiScreen() {
  const [status, setStatus] = React.useState("active");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const visible = wikis.filter((w) =>
    (status === "archived" ? w.archived : !w.archived) &&
    (!search || w.title.toLowerCase().includes(search.toLowerCase())));
  const selectedWiki = wikis.find((w) => w.id === selected);

  const changeStatus = (v) => { setLoading(true); setStatus(v); setTimeout(() => setLoading(false), 450); };

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 0, overflowY: "auto" }}>
      <div style={{ margin: "0 auto", display: "flex", width: "100%", maxWidth: "var(--content-max)", flexDirection: "column", gap: 20, padding: 24, boxSizing: "border-box" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>
            Wikis hold the written record for a workspace and link to the work items they document.
          </p>
          <Button><Icon name="plus" size={16} />New wiki</Button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", minWidth: 220, maxWidth: 320, flex: 1 }}>
            <span style={{ position: "absolute", left: 12, top: 12, color: "hsl(var(--muted-foreground))", pointerEvents: "none" }}><Icon name="search" /></span>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search wikis" style={{ paddingLeft: 36 }} />
          </div>
          <Tabs value={status} onValueChange={changeStatus} tabs={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]} />
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} style={{ height: 96, width: "100%", borderRadius: "var(--radius-xl)" }} />)}
          </div>
        ) : visible.length === 0 ? (
          <div style={{ borderRadius: "var(--radius-md)", border: "1px solid hsl(var(--border))", padding: 32, textAlign: "center", fontSize: "var(--text-sm)", color: "hsl(var(--muted-foreground))" }}>
            {status === "archived" ? "No archived wikis." : "No wikis yet."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 14 }}>
            {visible.map((w) => <WikiCard key={w.id} wiki={w} selected={selected === w.id} onOpen={() => setSelected(w.id)} />)}
          </div>
        )}
      </div>

      {selectedWiki ? (
        <Sheet open side="right" width={420} onOpenChange={() => setSelected(null)}>
          <SheetHeader>
            <SheetTitle>{selectedWiki.title}</SheetTitle>
            <SheetDescription>{selectedWiki.linked} linked work items</SheetDescription>
          </SheetHeader>
          <Separator />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: "var(--text-sm)" }}>
            <div style={{ fontWeight: "var(--font-weight-medium)" }}>Pages</div>
            {["Overview", "Site readiness checklist", "Customs contacts"].map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, color: "hsl(var(--muted-foreground))" }}>
                <Icon name="book-open" size={14} />{p}
              </div>
            ))}
            <Separator />
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="outline" size="sm">Manage access</Button>
              <Button variant="outline" size="sm">Revision history</Button>
            </div>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
Object.assign(window, { WikiScreen });
