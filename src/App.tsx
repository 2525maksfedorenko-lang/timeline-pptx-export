import { useEffect, useState } from 'react'
import { GanttChart } from './components/GanttChart'
import { Dashboard, type DashboardSection } from './components/Dashboard'
import { ExportSettingsPanel } from './components/ExportSettingsPanel'
import { PlanSwitcher } from './components/PlanSwitcher'
import { exportTimelineToPptx } from './export/pptxExporter'
import { exportTimelineToPdf } from './export/pdfExporter'
import { getExportParentItems, planOverview } from './export/timelineExportModel'
import { buildExportFilename } from './export/dateScale'
import { sortItems } from './utils/sortItems'
import { useTimelineStore } from './store/timelineStore'
import { usePeopleStore } from './store/peopleStore'

type Tab = 'timeline' | 'dashboard'

const DASHBOARD_VIEW_SECTIONS: DashboardSection[] = ['status', 'delayed', 'atrisk']

/** Reads the initial tab + highlighted dashboard section from
 * ?dashboardView=delayed|atrisk|status once at startup, so a shared link
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
  const loadPeople = usePeopleStore((state) => state.loadPeople)

  const [highlightSection] = useState<DashboardSection | null>(readDashboardViewParam)
  const [activeTab, setActiveTab] = useState<Tab>(highlightSection ? 'dashboard' : 'timeline')

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  useEffect(() => {
    void loadPeople()
  }, [loadPeople])

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
    void exportTimelineToPptx(items, exportOptions, comments, buildExportFilename(exportOptions.exportTimeframe, 'pptx'))
  }

  const handleExportPdf = () => {
    if (!confirmOverviewCapacity()) return
    void exportTimelineToPdf(items, exportOptions, comments, buildExportFilename(exportOptions.exportTimeframe, 'pdf'))
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

      <div className="mb-4 inline-flex rounded-md border border-[#E5E5E1] bg-white p-1">
        {(['timeline', 'dashboard'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? 'bg-[#1E2B38] text-white' : 'text-slate-500 hover:text-[#1E2B38]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'timeline' ? <GanttChart /> : <Dashboard highlightSection={highlightSection} />}

      <div className="mt-6" style={{ maxWidth: '50%' }}>
        <ExportSettingsPanel />
      </div>
    </div>
  )
}

export default App
