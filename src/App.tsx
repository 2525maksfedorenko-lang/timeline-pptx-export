import { useEffect, useState } from 'react'
import { Calendar, LayoutDashboard, Settings, Upload } from 'lucide-react'
import { GanttChart } from './components/GanttChart'
import { Dashboard, type DashboardSection } from './components/Dashboard'
import { SettingsFlyout } from './components/SettingsFlyout'
import { ExportOverflowModal } from './components/ExportOverflowModal'
import { ImportModal } from './components/ImportModal'
import { PlanNotice } from './components/PlanNotice'
import { PlanSwitcher } from './components/PlanSwitcher'
import { exportTimelineToPptx } from './export/pptxExporter'
import { exportTimelineToPdf } from './export/pdfExporter'
import { getExportOverviewItems, planOverview, type ExportMode } from './export/timelineExportModel'
import { buildExportFilename } from './export/dateScale'
import { sortItemsForExport } from './utils/sortItemsForExport'
import { useTimelineStore } from './store/timelineStore'
import { usePeopleStore } from './store/peopleStore'
import aicooLogo from '../design-system/assets/aicoo-logo-orbit-darkblue-text.svg'

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
  const [isImportOpen, setIsImportOpen] = useState(false)

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

  // More tasks in the effective date range than fit on one overview slide is a
  // real choice (truncate to one slide vs. page across several), so it goes to
  // the user rather than being decided here. Everything fitting exports
  // straight away — the two modes would produce the same file.
  //
  // Counted over every exportable task, not just the roots: the overview draws
  // subtasks as bars too, so the roots alone would under-count what has to fit.
  const handleExport = (format: ExportFormat) => {
    const overviewItems = getExportOverviewItems(sortItemsForExport(items, exportOptions.sortMode))
    const plan = planOverview(overviewItems, exportOptions.exportTimeframe)

    if (plan.inRange.length <= plan.capacity) {
      runExport(format, 'compact')
      return
    }

    setOverflow({ format, totalTasks: plan.inRange.length, capacity: plan.capacity })
  }

  return (
    <div className="flex min-h-screen flex-col bg-base-background">
      {/* The product's app header: 48px, hairline bottom border, white on the
          pale blue-grey page chrome. Actions sit on the right of the same row
          until there isn't one to share — on a phone they take their own row
          and split it evenly, which also gets them to a thumb-sized height. */}
      <header className="flex-shrink-0 border-b border-border bg-background">
        <div className="flex min-h-12 items-center gap-3 px-4 py-2 max-md:flex-col max-md:items-stretch max-md:gap-3">
          <div className="flex items-center gap-3">
            <img src={aicooLogo} alt="aicoo" className="h-8 w-auto" />
            <span className="h-5 w-px bg-border max-md:hidden" />
            {activeTab === 'timeline' ? (
              <Calendar size={20} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <LayoutDashboard size={20} strokeWidth={2} className="flex-shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <h1 className="truncate text-lg font-semibold">
              {activeTab === 'timeline' ? 'Timeline' : 'Dashboard'}
            </h1>
          </div>
          {/* Four actions share this row on a desktop. On a phone they'd each
              be squeezed to a third of the width they need, so below the
              breakpoint they become a 2x2 grid instead — every button then
              keeps a thumb-sized target and its label on one line. */}
          <div className="ml-auto flex items-center gap-2 max-md:ml-0 max-md:grid max-md:w-full max-md:grid-cols-2">
            {/* The single way in for a file, in the same row as the two
                ways out. Outline rather than filled: importing is a step
                towards the deck, not the thing this app is for. */}
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11 max-md:flex-1"
            >
              <Upload size={16} strokeWidth={2} aria-hidden="true" />
              Import
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-transparent px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground max-md:min-h-11 max-md:flex-1"
            >
              <Settings size={16} strokeWidth={2} />
              Settings
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground max-md:min-h-11 max-md:flex-1"
            >
              Export as PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport('pptx')}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 max-md:min-h-11 max-md:flex-1"
            >
              Export to PowerPoint
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-6 max-md:p-3">
      <PlanSwitcher />

      {/* Sits with the plan it describes, above the chart whose order the
          repair changed — and renders nothing at all when there was none. */}
      <PlanNotice />

      {/* Tabs, per the design system: a muted pill whose active item is a
          white card. Labels are Title Case like every other first-class
          object label in the product, so they are written out rather than
          capitalised from the value. */}
      <div className="mb-4 inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground max-md:flex max-md:w-full">
        {([['timeline', 'Timeline'], ['dashboard', 'Dashboard']] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-colors max-md:min-h-11 max-md:flex-1 ${
              activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'timeline' ? <GanttChart /> : <Dashboard highlightSection={highlightSection} />}

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
