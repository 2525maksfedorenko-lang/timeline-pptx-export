import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileText, Presentation, Sheet } from 'lucide-react';
import { buttonBaseClass, MENU_ITEM_CLASS, MENU_SURFACE_CLASS } from './systemUi';

/** The two formats that make a deck. Kept apart from `ExportFormat` because
 * the overview's slide capacity — and the question the overflow modal asks
 * about it — is a question only these two can be asked. */
export type DeckFormat = 'pptx' | 'pdf';

export type ExportFormat = DeckFormat | 'csv';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
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
export function ExportMenu({ onExport }: ExportMenuProps) {
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

  const choose = (format: ExportFormat) => {
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
          <button
            type="button"
            role="menuitem"
            onClick={() => choose('pptx')}
            className={MENU_ITEM_CLASS}
          >
            <Presentation size={14} strokeWidth={2} aria-hidden="true" />
            PowerPoint (.pptx)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose('pdf')}
            className={MENU_ITEM_CLASS}
          >
            <FileText size={14} strokeWidth={2} aria-hidden="true" />
            PDF (.pdf)
          </button>
          {/* Last, and not because it matters least: the two above are the
              plan as a document to send, and this one is the plan as data to
              open in a spreadsheet — or to bring back in through Import,
              which reads exactly the columns it writes. */}
          <button
            type="button"
            role="menuitem"
            onClick={() => choose('csv')}
            className={MENU_ITEM_CLASS}
          >
            <Sheet size={14} strokeWidth={2} aria-hidden="true" />
            Spreadsheet (.csv)
          </button>
        </div>
      )}
    </div>
  );
}
