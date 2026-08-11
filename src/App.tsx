import { useEffect, useRef } from 'react'
import { GanttChart } from './components/GanttChart'
import { ExportSettingsPanel } from './components/ExportSettingsPanel'
import { PlanSwitcher } from './components/PlanSwitcher'
import { exportTimelineToPptx } from './export/pptxExporter'
import { exportTimelineToPdf } from './export/pdfExporter'
import { parseImportedTasks } from './import/importTasks'
import { useTimelineStore } from './store/timelineStore'

function App() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addItem = useTimelineStore((state) => state.addItem)
  const loadPlans = useTimelineStore((state) => state.loadPlans)

  useEffect(() => {
    void loadPlans()
  }, [loadPlans])

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const items = parseImportedTasks(reader.result as string)
        items.forEach((item) => addItem(item))
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to import tasks.')
      }
    }
    reader.onerror = () => {
      alert('Failed to read the file.')
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-800">
          Timeline PPTX Export
        </h1>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => exportTimelineToPptx()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            Export to PowerPoint
          </button>
          <button
            type="button"
            onClick={() => exportTimelineToPdf()}
            className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            Export as PDF
          </button>
        </div>
      </div>
      <PlanSwitcher />
      <ExportSettingsPanel />
      <GanttChart />
    </div>
  )
}

export default App
