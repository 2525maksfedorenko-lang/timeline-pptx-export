import { useEffect, type RefObject } from 'react';

// Everything that can hold focus in a dialog of ours. `[href]` covers links,
// and the :not() clauses drop the ones that are present but unreachable —
// a disabled button, or an input the browser keeps out of the tab order.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside `container` while it is mounted, moves focus into it on
 * open, and hands focus back to whatever had it when the dialog closes.
 *
 * Without the wrap, Tab walks straight out of a dialog and off into the page
 * behind it — which for a keyboard or screen-reader user means the modal is
 * modal in appearance only: focus lands on the chart, the export buttons and
 * the plan tabs, all of them visually covered by the backdrop.
 *
 * Restoring focus afterwards matters just as much: without it, closing the
 * dialog drops focus onto <body>, and the next Tab starts again from the top
 * of the page rather than from the button that opened it. */
export function useFocusTrap(container: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const previouslyFocused = document.activeElement;

    const focusable = () => Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE));
    // The dialog's own first control, not the page's — and if it somehow has
    // none, the panel itself, so focus is at least inside the trap.
    (focusable()[0] ?? element).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      // Re-read on every Tab rather than caching: this dialog swaps its
      // buttons as it moves from picking a file to confirming an import, and
      // a cached list would still be trapping against the previous step's.
      const items = focusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Focus can sit outside the list entirely — on the panel itself, or on
      // an element that has just been removed — in which case Tab is sent
      // back to an end of it rather than left to escape.
      if (event.shiftKey && (active === first || !element.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !element.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [container]);
}
