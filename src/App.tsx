import { useEffect } from 'react'
import { GanttChart } from './components/GanttChart'
import { ExportSettingsPanel } from './components/ExportSettingsPanel'
import { PlanSwitcher } from './components/PlanSwitcher'
import { exportTimelineToPptx } from './export/pptxExporter'
import { exportTimelineToPdf } from './export/pdfExporter'
import { useTimelineStore } from './store/timelineStore'

function App() {
  const loadPlans = useTimelineStore((state) => state.loadPlans)
  const items = useTimelineStore((state) => state.items)
  const exportOptions = useTimelineStore((state) => state.exportOptions)
  const comments = useTimelineStore((state) => state.comments)

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-800">
          Timeline PPTX Export
        </h1>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void exportTimelineToPptx(items, exportOptions, comments)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Export to PowerPoint
          </button>
          <button
            type="button"
            onClick={() => void exportTimelineToPdf(items, exportOptions, comments)}
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
