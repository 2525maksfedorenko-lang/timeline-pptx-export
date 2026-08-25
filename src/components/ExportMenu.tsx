import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileText, Presentation } from 'lucide-react';
import {
  buttonBaseClass,
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  MENU_SEPARATOR_CLASS,
  MENU_SURFACE_CLASS,
} from './systemUi';

export type ExportFormat = 'pptx' | 'pdf';

/** What the deck will hold when the plan screen is filtered down to one
 * status: the chip's own word, and how many tasks are left under it. Null
 * when the whole plan is on screen and the deck holds all of it. */
export interface ExportScope {
  label: string;
  count: number;
}

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  scope?: ExportScope | null;
}

/** The toolbar's Export button: one word, and the choice of file behind it.
 *
 * Two buttons labelled PDF and PPTX said what the formats were but never what
 * pressing one did, and spent the header's scarcest space saying it twice.
 * The verb is the button now; the format is the menu, where a name has room
 * to be a name rather than an abbreviation.
 *
 * Drawn to the design system's menu contract, like the plan menu and the row
 * context menu — see MENU_SURFACE_CLASS in systemUi.ts. */
export function ExportMenu({ onExport, scope = null }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // pointerdown in the capture phase, for the reason written down in
    // ContextMenu: the plan's canvas cancels the compatibility mouse events.
    const onPointerDown = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  // Nothing left under the chip is not an empty deck to hand someone — it is
  // an export there is no point starting, so the formats say so instead of
  // producing a file with one title slide in it.
  const isEmpty = scope !== null && scope.count === 0;

  const choose = (format: ExportFormat) => {
    if (isEmpty) return;
    setIsOpen(false);
    onExport(format);
  };

  return (
    <div ref={rootRef} className="relative flex-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={buttonBaseClass('default', 'h-8 whitespace-nowrap px-3 text-xs font-semibold')}
      >
        Export
        <ChevronDown size={13} strokeWidth={2.4} aria-hidden="true" />
      </button>

      {isOpen && (
        <div role="menu" className={`absolute right-0 top-[calc(100%+4px)] ${MENU_SURFACE_CLASS}`}>
          {/* Said here rather than on the button: the deck following the chip
              is the right behaviour, but a file that quietly holds a third of
              the plan is not something to find out about afterwards. */}
          {scope !== null && (
            <>
              {/* nowrap, so the surface widens to the sentence instead of
                  breaking "In progress only · 3 tasks" across two lines. */}
              <div className={`${MENU_LABEL_CLASS} whitespace-nowrap font-normal text-muted-foreground`}>
                {isEmpty
                  ? `No ${scope.label.toLowerCase()} tasks to export`
                  : `${scope.label} only · ${scope.count} ${scope.count === 1 ? 'task' : 'tasks'}`}
              </div>
              <div className={MENU_SEPARATOR_CLASS} />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => choose('pptx')}
            disabled={isEmpty}
            className={MENU_ITEM_CLASS}
          >
            <Presentation size={14} strokeWidth={2} aria-hidden="true" />
            PowerPoint (.pptx)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose('pdf')}
            disabled={isEmpty}
            className={MENU_ITEM_CLASS}
          >
            <FileText size={14} strokeWidth={2} aria-hidden="true" />
            PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  );
}
