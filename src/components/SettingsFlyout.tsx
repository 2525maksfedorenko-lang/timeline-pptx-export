import { useEffect } from 'react';
import { ExportSettingsPanel } from './ExportSettingsPanel';

interface SettingsFlyoutProps {
  onClose: () => void;
}

/** The export settings, as a panel that slides in from the right over the
 * chart instead of a block sitting under it.
 *
 * Same overlay+backdrop pattern as ExportOverflowModal and TaskDetailsModal
 * — a fixed inset-0 scrim with the surface inside it — just anchored to one
 * edge and full height rather than centered. Closing is unconditional here
 * (backdrop, Escape, the ✕): unlike the task modal there's no draft to
 * lose, since every control inside writes to the store as it's touched. */
export function SettingsFlyout({ onClose }: SettingsFlyoutProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1E2B38]/40"
      onClick={onClose}
      role="presentation"
    >
      <aside
        // The click guard is what makes the backdrop-only close work: a
        // click on a control inside must not bubble up to the scrim.
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Export settings"
        className="flex h-full w-full max-w-md animate-[flyout-in_180ms_ease-out] flex-col border-l border-[#E5E5E1] bg-white shadow-xl"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[#E5E5E1] px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight text-[#1E2B38]">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-xl leading-none text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#1E2B38] max-md:h-11 max-md:w-11"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* The panel is long — the task list, the comment mode, the
            toggles, the timeframe and every saved comment — so the body
            scrolls while the header above stays put. */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ExportSettingsPanel />
        </div>
      </aside>
    </div>
  );
}
