import { useEffect, useState } from 'react'
import { GanttChart } from './components/GanttChart'
import { Dashboard, type DashboardSection } from './components/Dashboard'
import { SettingsFlyout } from './components/SettingsFlyout'
import { ExportOverflowModal } from './components/ExportOverflowModal'
import { PlanSwitcher } from './components/PlanSwitcher'
import { exportTimelineToPptx } from './export/pptxExporter'
import { exportTimelineToPdf } from './export/pdfExporter'
import { getExportParentItems, planOverview, type ExportMode } from './export/timelineExportModel'
import { buildExportFilename } from './export/dateScale'
import { sortItems } from './utils/sortItems'
import { useTimelineStore } from './store/timelineStore'
import { usePeopleStore } from './store/peopleStore'

type Tab = 'timeline' | 'dashboard'
type ExportFormat = 'pptx' | 'pdf'

/** The export the user asked for, held while the overflow modal asks how to
 * handle the tasks that don't fit on one overview slide. */
interface PendingOverflowExport {
  format: ExportFormat
  totalTasks: number
  capacity: number
}

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
  const people = usePeopleStore((state) => state.people)
  const loadPeople = usePeopleStore((state) => state.loadPeople)

  const [highlightSection] = useState<DashboardSection | null>(readDashboardViewParam)
  const [activeTab, setActiveTab] = useState<Tab>(highlightSection ? 'dashboard' : 'timeline')
  const [overflow, setOverflow] = useState<PendingOverflowExport | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  useEffect(() => {
    void loadPeople()
  }, [loadPeople])

  const runExport = (format: ExportFormat, exportMode: ExportMode) => {
    const fileName = buildExportFilename(exportOptions.exportTimeframe, format)
    const exportTimeline = format === 'pptx' ? exportTimelineToPptx : exportTimelineToPdf
    void exportTimeline(items, exportOptions, comments, people, fileName, exportMode)
  }

  // More top-level tasks in the effective date range than fit on one overview
  // slide is a real choice (truncate to one slide vs. page across several),
  // so it goes to the user rather than being decided here. Everything fitting
  // exports straight away — the two modes would produce the same file.
  const handleExport = (format: ExportFormat) => {
    const parentItems = getExportParentItems(sortItems(items, exportOptions.sortMode))
    const plan = planOverview(parentItems, exportOptions.exportTimeframe)

    if (plan.inRange.length <= plan.capacity) {
      runExport(format, 'compact')
      return
    }

    setOverflow({ format, totalTasks: plan.inRange.length, capacity: plan.capacity })
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 max-md:p-4">
      {/* Title and the two export buttons share a line until there isn't
          one to share: on a phone the buttons take their own row and split
          it evenly, which also gets them to a thumb-sized height. */}
      <div className="mb-6 flex items-center justify-between max-md:flex-col max-md:items-stretch max-md:gap-3">
        <h1 className="text-3xl font-semibold text-slate-800 max-md:text-2xl">
          Timeline PPTX Export
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-md border border-[#E5E5E1] bg-white px-4 py-2 text-sm font-medium text-[#1E2B38] shadow-sm transition-colors hover:border-[#2A9D90] hover:text-[#2A9D90] max-md:min-h-11 max-md:flex-1"
          >
            ⚙ Settings
          </button>
          <button
            type="button"
            onClick={() => handleExport('pptx')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 max-md:min-h-11 max-md:flex-1"
          >
            Export to PowerPoint
          </button>
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 max-md:min-h-11 max-md:flex-1"
          >
            Export as PDF
          </button>
        </div>
      </div>
      <PlanSwitcher />

      <div className="mb-4 inline-flex rounded-md border border-[#E5E5E1] bg-white p-1 max-md:flex">
        {(['timeline', 'dashboard'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors max-md:min-h-11 max-md:flex-1 ${
              activeTab === tab ? 'bg-[#1E2B38] text-white' : 'text-slate-500 hover:text-[#1E2B38]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'timeline' ? <GanttChart /> : <Dashboard highlightSection={highlightSection} />}

      {isSettingsOpen && <SettingsFlyout onClose={() => setIsSettingsOpen(false)} />}

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
