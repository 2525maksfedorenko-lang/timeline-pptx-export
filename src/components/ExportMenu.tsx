import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FileJson, FileText, Presentation, Sheet } from 'lucide-react';
import { buttonBaseClass, MENU_ITEM_CLASS, MENU_SEPARATOR_CLASS, MENU_SURFACE_CLASS } from './systemUi';

/** The two formats that make a deck. Kept apart from `ExportFormat` because
 * the overview's slide capacity — and the question the overflow modal asks
 * about it — is a question only these two can be asked. */
export type DeckFormat = 'pptx' | 'pdf';

export type ExportFormat = DeckFormat | 'csv' | 'json';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  /** Whether there is a saved plan to write out as JSON. False only before
   * the plan list has loaded — the row is disabled rather than absent, so the
   * menu does not change length under the pointer. */
  hasSavedPlan: boolean;
}

/** The toolbar's Export button: one word, and the choice of file behind it.
 *
 * Two buttons labelled PDF and PPTX said what the formats were but never what
 * pressing one did, and spent the header's scarcest space saying it twice.
 * The verb is the button now; the format is the menu, where a name has room
 * to be a name rather than an abbreviation. The plan's own JSON is named the
 * same way for the same reason: it used to be "Save as JSON" in the plan menu,
 * where it needed its own verb, and here the verb is already overhead.
 *
 * Drawn to the design system's menu contract, like the plan menu and the row
 * context menu — see MENU_SURFACE_CLASS in systemUi.ts. */
export function ExportMenu({ onExport, hasSavedPlan }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // pointerdown in the capture phase, for the reason written down in
    // ContextMenu: the plan's canvas cancels the compatibility mouse events.
    const onPointerDown = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      // Focus goes back where it was opened from. Dismissing with Escape
      // otherwise drops it on <body>, and the next Tab restarts at the top of
      // the page instead of continuing along the toolbar.
      triggerRef.current?.focus();
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
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={buttonBaseClass(
          'default',
          'h-8 whitespace-nowrap px-3 text-xs font-semibold max-md:h-10 max-md:px-2.5',
        )}
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
          {/* The three above are renderings of the plan — a deck to show, a
              document to send, a table to work in. This one is the plan
              itself: every field a task carries, its ids and its export
              settings, which is what makes it the file that comes back
              unchanged where a CSV comes back re-keyed by name. (A saved plan
              holds no comments, so neither does the file.) The rule says that
              much without a heading. */}
          <div className={MENU_SEPARATOR_CLASS} />
          <button
            type="button"
            role="menuitem"
            onClick={() => choose('json')}
            disabled={!hasSavedPlan}
            className={MENU_ITEM_CLASS}
          >
            <FileJson size={14} strokeWidth={2} aria-hidden="true" />
            Plan (.json)
          </button>
        </div>
      )}
    </div>
  );
}
