import { GanttChart } from './components/GanttChart'
import { exportTimelineToPptx } from './export/pptxExporter'
import { exportTimelineToPdf } from './export/pdfExporter'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-800">
          Timeline PPTX Export
        </h1>
        <div className="flex gap-3">
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
      <GanttChart />
    </div>
  )
}

export default App
