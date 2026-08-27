import { useEffect, useState } from 'react'
import { GanttScreen } from './gantt/GanttScreen'
import { GanttToolbar } from './gantt/GanttToolbar'
import { Dashboard, type DashboardSection } from './components/Dashboard'
import { SettingsFlyout } from './components/SettingsFlyout'
import { ExportOverflowModal } from './components/ExportOverflowModal'
import { ImportModal } from './components/ImportModal'
import { ExportMenu, type DeckFormat, type ExportFormat } from './components/ExportMenu'
import { Settings } from 'lucide-react'
import { PlanNotice } from './components/PlanNotice'
import { exportTimelineToPptx } from './export/pptxExporter'
import { exportTimelineToPdf } from './export/pdfExporter'
import { downloadPlanCsv } from './export/planCsv'
import { exportPlanToJsonFile } from './import/planJson'
import { getExportOverviewItems, planOverview, type ExportMode } from './export/timelineExportModel'
import { buildExportFilename } from './export/dateScale'
import { sortItemsForExport } from './utils/sortItemsForExport'
import { flushedActivePlan, useTimelineStore } from './store/timelineStore'
import { buttonBaseClass } from './components/systemUi';

type Tab = 'timeline' | 'dashboard'

/** The export the user asked for, held while the overflow modal asks how to
 * handle the tasks that don't fit on one overview slide. */
interface PendingOverflowExport {
  format: DeckFormat
  totalTasks: number
  capacity: number
}

const DASHBOARD_VIEW_SECTIONS: DashboardSection[] = ['status', 'delayed']

/** Reads the initial tab + highlighted dashboard section from
 * ?dashboardView=delayed|status once at startup, so a shared link
 * opens straight on the right view instead of the default Timeline tab. */
function readDashboardViewParam(): DashboardSection | null {
  const value = new URLSearchParams(window.location.search).get('dashboardView')
  return (DASHBOARD_VIEW_SECTIONS as string[]).includes(value ?? '') ? (value as DashboardSection) : null
}

function App() {
  const loadPlans = useTimelineStore((state) => state.loadPlans)
  const items = useTimelineStore((state) => state.items)
  const exportOptions = useTimelineStore((state) => state.exportOptions)
  const comments = useTimelineStore((state) => state.comments)

  // What the deck is made of: the whole plan. Nothing on the plan screen
  // narrows it — a focus is a way of looking at a plan rather than a statement
  // about it, and a branch worth its own deck has its own plan now (see
  // createPlanFromBranch). What a deck leaves out is said per task, with
  // "Exclude from export", and the exporters read that themselves.
  const [highlightSection] = useState<DashboardSection | null>(readDashboardViewParam)
  // Fixed at startup, not switched: the toolbar no longer offers the two
  // views. The dashboard is what a deck's QR codes open (?dashboardView=…),
  // which is the only thing that still selects it.
  const [activeTab] = useState<Tab>(highlightSection ? 'dashboard' : 'timeline')
  const [overflow, setOverflow] = useState<PendingOverflowExport | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // Only for the Export menu's JSON row, which is disabled until there is a
  // plan record to write. Everything else about that file is read at the click
  // (see handleExport), not subscribed to.
  const activePlanId = useTimelineStore((state) => state.activePlanId)
  const [isImportOpen, setIsImportOpen] = useState(false)

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const runExport = (format: DeckFormat, exportMode: ExportMode) => {
    const fileName = buildExportFilename(exportOptions.exportTimeframe, format)
    const exportTimeline = format === 'pptx' ? exportTimelineToPptx : exportTimelineToPdf
    void exportTimeline(items, exportOptions, comments, fileName, exportMode)
  }

  // More tasks in the effective date range than fit on one overview slide is a
  // real choice (truncate to one slide vs. page across several), so it goes to
  // the user rather than being decided here. Everything fitting exports
  // straight away — the two modes would produce the same file.
  //
  // Counted over every exportable task, not just the roots: the overview draws
  // subtasks as bars too, so the roots alone would under-count what has to fit.
  const handleExport = (format: ExportFormat) => {
    // A table has no slides, so none of the paging question below is one it
    // can be asked: every exportable task is a row, however many there are.
    // The filename is built by the same rule as the other two.
    if (format === 'csv') {
      downloadPlanCsv(items, buildExportFilename(exportOptions.exportTimeframe, 'csv'))
      return
    }

    // The plan itself rather than a rendering of it, so it is the plan record
    // that is written — with the working copy flushed into it first, or the
    // file would be missing every edit made since this plan was opened while
    // the three formats above all read what is on screen.
    if (format === 'json') {
      const plan = flushedActivePlan(useTimelineStore.getState())
      if (plan) exportPlanToJsonFile(plan)
      return
    }

    const overviewItems = getExportOverviewItems(sortItemsForExport(items))
    const plan = planOverview(overviewItems, exportOptions.exportTimeframe)

    if (plan.inRange.length <= plan.capacity) {
      runExport(format, 'compact')
      return
    }

    setOverflow({ format, totalTasks: plan.inRange.length, capacity: plan.capacity })
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base-background">
      {/* One header for the whole app. The plan's own controls are the
          handoff's; this app's four actions and its view switch join them at
          the right of the top row, because there is nowhere else for them to
          live once the screen is the plan. */}
      <GanttToolbar
        showTimelineControls={activeTab === 'timeline'}
        actions={
          <>
            {/* The two things the app does to a whole plan, both said as the
                verb. Which file an export produces is a question for the menu
                behind it, not for the header. */}
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className={buttonBaseClass('outline', 'h-8 whitespace-nowrap px-3 text-xs font-semibold')}
            >
              Import
            </button>
            <ExportMenu onExport={handleExport} hasSavedPlan={activePlanId !== null} />
            {/* The export settings, beside the button whose files they
                govern — what to include, in what order, over what window.
                No label: a gear is the one glyph that needs none, and the
                row's width is the scarcest thing in this header. */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="Export settings"
              aria-label="Export settings"
              className={buttonBaseClass('outline', 'h-8 w-8 flex-none px-0')}
            >
              <Settings size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col">
        {/* Sits with the plan it describes, above the chart whose order the
            repair changed — and renders nothing at all when there was none. */}
        <div className="flex-none empty:hidden [&>*]:mx-6 [&>*]:mt-4 max-md:[&>*]:mx-3">
          <PlanNotice />
        </div>

        {/* The plan screen runs edge to edge and owns its own scrolling: its
            canvas is one scroll container that has to reach the window's
            edges to be worth scrolling. The dashboard keeps page padding. */}
        {activeTab === 'timeline' ? (
          <GanttScreen />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-6 max-md:p-3">
            <Dashboard highlightSection={highlightSection} />
          </div>
        )}
      </main>

      {isSettingsOpen && <SettingsFlyout onClose={() => setIsSettingsOpen(false)} />}

      {isImportOpen && <ImportModal onClose={() => setIsImportOpen(false)} />}

      {overflow && (
        <ExportOverflowModal
          totalTasks={overflow.totalTasks}
          capacity={overflow.capacity}
          onSelect={(exportMode) => {
            runExport(overflow.format, exportMode)
            setOverflow(null)
          }}
          onCancel={() => setOverflow(null)}
        />
      )}
    </div>
  )
}

export default App
