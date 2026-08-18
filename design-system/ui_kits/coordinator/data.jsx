const projects = [
  { id: "p1", title: "Rollout DACH", active: true, status: "on track", due: "Sep 30, 2026", progress: 64 },
  { id: "p2", title: "Warehouse migration Phase 2", active: true, status: "delayed", due: "Aug 14, 2026", progress: 38 },
  { id: "p3", title: "Supplier onboarding", active: false, status: "done", due: "Jul 01, 2026", progress: 100 },
  { id: "p4", title: "ERP interface cleanup", active: true, status: "on track", due: "Nov 12, 2026", progress: 21 },
];

const kpis = [
  { title: "Proposed Task Updates", value: 12, explanation: "Tasks with pending update proposals", icon: "clipboard-edit" },
  { title: "Proposed New Tasks", value: 5, explanation: "New tasks waiting for approval", icon: "plus-circle" },
  { title: "Delayed Tasks", value: 7, explanation: "Tasks past their due date", icon: "clock" },
  { title: "Delayed Projects", value: 2, explanation: "Projects ETC beyond the deadline", icon: "alert-circle" },
];

const board = [
  { id: "s1", display: "Backlog", type: 1, tasks: [
    { id: "t1", name: "Collect site requirements Vienna", dates: "Aug 03 '26 - Aug 21 '26", assignees: ["M"], kind: "task" },
    { id: "t2", name: "Phase: Pilot rollout", dates: "Sep 01 '26 - Oct 15 '26", assignees: ["J","A"], kind: "phase", subTasks: 8 },
  ]},
  { id: "s2", display: "In progress", type: 2, tasks: [
    { id: "t3", name: "Negotiate logistics SLA", dates: "Aug 10 '26 - Sep 04 '26", assignees: ["A"], kind: "task", issues: 2, mails: 3, misaligned: true },
    { id: "t4", name: "Train warehouse leads", dates: "due Aug 28 '26", assignees: ["M","J","A","K"], kind: "task", comments: true },
  ]},
  { id: "s3", display: "Review", type: 6, tasks: [
    { id: "t5", name: "Approve customs documentation", dates: "due Aug 22 '26", assignees: ["J"], kind: "task", proposal: "update" },
    { id: "t6", name: "Draft supplier comms plan", dates: "Aug 18 '26 - Aug 25 '26", assignees: [], kind: "task", proposed: true },
  ]},
  { id: "s4", display: "Done", type: 3, tasks: [
    { id: "t7", name: "Kick-off workshop Munich", dates: "Jul 07 '26 - Jul 09 '26", assignees: ["M","A"], kind: "task" },
    { id: "t8", name: "Archived: legacy label mapping", dates: "Jun 02 '26 - Jun 30 '26", assignees: ["K"], kind: "task", archived: true },
  ]},
];

const channels = [
  { id: "c1", name: "#dach-rollout", source: "slack", sourceLabel: "Slack · acme.slack.com", owner: true, members: 14, projects: 2, group: "Rollout DACH" },
  { id: "c2", name: "logistics@acme.example", source: "email", sourceLabel: "Email address", owner: true, members: 6, projects: 1, group: "Rollout DACH" },
  { id: "c3", name: "Weekly steering call", source: "sembly", sourceLabel: "Sembly meeting sink", owner: false, ownerName: "J. Dorn", members: 9, projects: 2, group: "Rollout DACH" },
  { id: "c4", name: "#warehouse-migration", source: "slack", sourceLabel: "Slack · acme.slack.com", owner: true, members: 11, projects: 1, group: "Warehouse migration Phase 2" },
  { id: "c5", name: "Site visit recordings", source: "recording", sourceLabel: "Internal recording", owner: true, members: 4, projects: 1, group: "Warehouse migration Phase 2" },
  { id: "c6", name: "Supplier questions", source: "chat", sourceLabel: "Internal chat", owner: false, ownerName: "A. Behrens", members: 7, projects: 0, group: "Unrouted", archived: true },
];

const wikis = [
  { id: "w1", title: "Rollout DACH handbook", linked: 3 },
  { id: "w2", title: "Warehouse SOPs", linked: 2 },
  { id: "w3", title: "Customs & compliance", linked: 1 },
  { id: "w4", title: "Onboarding checklist", linked: 4 },
  { id: "w5", title: "Legacy label mapping", linked: 0, archived: true },
];

Object.assign(window, { projects, kpis, board, channels, wikis });
