import { useEffect, useState } from 'react'
import { GanttScreen } from './gantt/GanttScreen'
import { GanttToolbar } from './gantt/GanttToolbar'
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

/** The export the user asked for, held while the overflow modal asks how to
 * handle the tasks that don't fit on one overview slide. */
interface PendingOverflowExport {
  format: DeckFormat
  totalTasks: number
  capacity: number
}

function App() {
  const loadPlans = useTimelineStore((state) => state.loadPlans)
  const items = useTimelineStore((state) => state.items)
  const exportOptions = useTimelineStore((state) => state.exportOptions)
  const comments = useTimelineStore((state) => state.comments)

  // What the deck is made of: the whole plan. Nothing on this screen narrows
  // it — a branch worth its own deck has its own plan now (see
  // createPlanFromBranch). What a deck leaves out is said per task, with
  // "Exclude from export", and the exporters read that themselves.
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

  // The shell is `100vh` tall, and `100dvh` below the mobile breakpoint. On
  // iOS Safari the layout viewport keeps running under the address bar, so a
  // screen measured in `vh` puts its last row — here the chart's own bottom
  // edge, and the create lane along it — behind that bar until it retracts.
  // The two units are the same number on a desktop, and the utility is scoped
  // to `max-md` anyway: nothing above 768px changes.
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base-background max-md:h-[100dvh]">
      {/* One header for the whole app. The plan's own controls are the
          handoff's; this app's four actions and its view switch join them at
          the right of the top row, because there is nowhere else for them to
          live once the screen is the plan. */}
      <GanttToolbar
        actions={
          <>
            {/* The two things the app does to a whole plan, both said as the
                verb. Which file an export produces is a question for the menu
                behind it, not for the header. */}
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              // Taller and tighter below the breakpoint: 40px is a target a
              // thumb can find, and the two px it gives back go to the plan's
              // name at the other end of the row.
              className={buttonBaseClass(
                'outline',
                'h-8 whitespace-nowrap px-3 text-xs font-semibold max-md:h-10 max-md:px-2.5',
              )}
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
              className={buttonBaseClass('outline', 'h-8 w-8 flex-none px-0 max-md:h-10 max-md:w-10')}
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

        {/* The one screen this app has. It runs edge to edge and owns its own
            scrolling: its canvas is one scroll container that has to reach the
            window's edges to be worth scrolling. */}
        <GanttScreen />
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
