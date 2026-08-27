import { useEffect, useRef } from 'react';
import { ExportSettingsPanel } from './ExportSettingsPanel';
import { X } from 'lucide-react';
import { useFocusTrap } from '../utils/useFocusTrap';
import { buttonClass } from './systemUi';

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
 * lose, since every control inside writes to the store as it's touched.
 *
 * Focus is trapped the way the import dialog's is, and for the same reason:
 * this says `aria-modal`, and without the trap Tab walks straight out of it
 * onto the chart and the toolbar behind the scrim. It matters more now that
 * the toolbar's gear is the only way in — the panel has to be operable by
 * whoever opened it, and closing hands focus back to that gear. */
export function SettingsFlyout({ onClose }: SettingsFlyoutProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  useFocusTrap(panelRef);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-overlay-scrim"
      onClick={onClose}
      role="presentation"
    >
      <aside
        ref={panelRef}
        // The click guard is what makes the backdrop-only close work: a
        // click on a control inside must not bubble up to the scrim.
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Export settings"
        className="flex h-full w-full max-w-md animate-[flyout-in_180ms_ease-out] flex-col border-l border-border bg-background shadow-lg"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className={buttonClass('ghost', 'icon', 'text-muted-foreground flex max-md:h-11 max-md:w-11')}
            aria-label="Close settings"
          >
            <X size={16} strokeWidth={2} />
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
