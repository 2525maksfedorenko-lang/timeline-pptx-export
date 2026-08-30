import { useEffect, useRef } from 'react';

/* How a layer in this app is put away, written once.
 *
 * There are two shapes and they are not the same. A **modal** — the import
 * dialog, the settings flyout — covers the screen behind a scrim, so a press
 * outside it lands on that scrim and the component's own `onClick` closes it;
 * the only thing left to wire is the key. A **menu** — the export dropdown,
 * the plan menu — hangs off its trigger with nothing between it and the page,
 * so it has to watch for a press anywhere else itself, and it has to hand
 * focus back to the trigger it came from.
 *
 * The one piece of platform knowledge both menus needed is now in one place:
 * the outside press is watched on `pointerdown` in the **capture** phase, not
 * on `mousedown`. The plan's canvas calls `preventDefault()` on its own
 * pointerdown to start a pan, which suppresses the compatibility mouse events
 * entirely — a `mousedown` listener never hears a press on the chart, and the
 * menu sits open over a canvas being dragged underneath it. Capture, so a
 * `stopPropagation` on the way up cannot hide the press either.
 *
 * `ContextMenu` deliberately does not use these. It is portaled to `<body>`,
 * opens at the pointer rather than off a trigger, has no draft inside to lose
 * and no trigger to return focus to, and it listens for `contextmenu` as well
 * so a second right-click elsewhere replaces it. Its wiring is its own; the
 * reason for the capture-phase pointerdown is the same one written above.
 */

/** Calls `onEscape` while this component is mounted. For a layer that is only
 * rendered while it is open, which is how every modal in this app works. */
export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);
}

interface MenuDismissOptions {
  /** Nothing is listened for while the menu is shut. */
  isOpen: boolean;
  /** The element a press has to land outside of to count as "outside". Both
   * callers wrap trigger *and* surface in it, so pressing the trigger to close
   * an open menu is that button's own click, not a dismissal and a re-open. */
  rootRef: React.RefObject<HTMLElement | null>;
  /** Focused again after Escape. Dismissing with the key otherwise drops focus
   * on `<body>`, and the next Tab restarts at the top of the page instead of
   * continuing along the header. Not done for an outside press, which has
   * already put focus somewhere the user chose. */
  triggerRef: React.RefObject<HTMLElement | null>;
  onOutsidePress: () => void;
  /** Kept separate from `onOutsidePress` because the two are not the same
   * intent: the plan menu clears its half-typed name on Escape and leaves it
   * standing when the press simply went elsewhere. */
  onEscape: () => void;
}

/** The dismissal wiring shared by the header's two dropdowns. */
export function useMenuDismiss({
  isOpen,
  rootRef,
  triggerRef,
  onOutsidePress,
  onEscape,
}: MenuDismissOptions): void {
  // Read through a ref rather than listed as dependencies. Both callers build
  // their callbacks inline, so a dependency on them would re-attach both
  // listeners on every render of the header — where the effect they replaced
  // attached once per opening. The ref keeps that, and the listeners still
  // call whatever the latest render passed.
  const latest = useRef({ onOutsidePress, onEscape });
  latest.current = { onOutsidePress, onEscape };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) latest.current.onOutsidePress();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      latest.current.onEscape();
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, rootRef, triggerRef]);
}
