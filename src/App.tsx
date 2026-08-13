import { useEffect } from 'react'
import { GanttChart } from './components/GanttChart'
import { ExportSettingsPanel } from './components/ExportSettingsPanel'
import { PlanSwitcher } from './components/PlanSwitcher'
import { exportTimelineToPptx } from './export/pptxExporter'
import { exportTimelineToPdf } from './export/pdfExporter'
import { getExportParentItems, planOverview } from './export/timelineExportModel'
import { sortItems } from './utils/sortItems'
import { useTimelineStore } from './store/timelineStore'

function App() {
  const loadPlans = useTimelineStore((state) => state.loadPlans)
  const items = useTimelineStore((state) => state.items)
  const exportOptions = useTimelineStore((state) => state.exportOptions)
  const comments = useTimelineStore((state) => state.comments)

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  // Overview is always a single slide: if more top-level tasks fall in the
  // effective date range than fit on it, confirm with the user before
  // silently truncating which ones get exported.
  const confirmOverviewCapacity = () => {
    const sortedItems = sortItems(items, exportOptions.sortMode)
    const parentItems = getExportParentItems(sortedItems)
    const plan = planOverview(parentItems, exportOptions.exportTimeframe)

    if (plan.inRange.length <= plan.capacity) return true

    return window.confirm(
      `Your plan has ${plan.inRange.length} tasks in this range, only ${plan.capacity} fit on one slide. ` +
        'Continue with first ' +
        `${plan.capacity}, or cancel to narrow the timeframe or select fewer tasks?`,
    )
  }

  const handleExportPptx = () => {
    if (!confirmOverviewCapacity()) return
    void exportTimelineToPptx(items, exportOptions, comments)
  }

  const handleExportPdf = () => {
    if (!confirmOverviewCapacity()) return
    void exportTimelineToPdf(items, exportOptions, comments)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-800">
          Timeline PPTX Export
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleExportPptx}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Export to PowerPoint
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            Export as PDF
          </button>
        </div>
      </div>
      <PlanSwitcher />
      <GanttChart />
      <div className="mt-6" style={{ maxWidth: '50%' }}>
        <ExportSettingsPanel />
      </div>
    </div>
  )
}

export default App
