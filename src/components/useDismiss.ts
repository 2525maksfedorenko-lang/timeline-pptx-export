import { useEffect, useRef } from 'react';

/* How a layer in this app is put away, written once.
 *
 * There are three shapes and they are not the same. A **modal** — the import
 * dialog, the settings flyout — covers the screen behind a scrim, so a press
 * outside it lands on that scrim and the component's own `onClick` closes it;
 * the only thing left to wire is the key. A **menu** — the export dropdown,
 * the plan menu — hangs off its trigger with nothing between it and the page,
 * so it has to watch for a press anywhere else itself, and it has to hand
 * focus back to the trigger it came from. A **panel** — the Edit Task column —
 * sits beside a working surface rather than over it, so most of what it has to
 * ignore is that surface still being used: a drag across the chart, a task
 * being drawn, a press on another bar that is a request to show *that* task
 * rather than to close.
 *
 * The one piece of platform knowledge both menus needed is now in one place:
 * the outside press is watched on `pointerdown` in the **capture** phase, not
 * on `mousedown`. The plan's canvas calls `preventDefault()` on its own
 * pointerdown to start a pan, which suppresses the compatibility mouse events
 * entirely — a `mousedown` listener never hears a press on the chart, and the
 * menu sits open over a canvas being dragged underneath it. Capture, so a
 * `stopPropagation` on the way up cannot hide the press either.
 *
 * The panel is also the one that cannot decide on `pointerdown` alone. A pan
 * of the chart begins with a press outside the panel and is not a dismissal;
 * whether it was one is only known when the pointer comes up without having
 * travelled. So the panel's rule is a click assembled out of pointer events —
 * down outside, up outside, nothing moved in between — which is the same
 * decision `click` would make, taken from events the canvas does not suppress.
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

/** Controls that own Escape while they hold focus.
 *
 * A key press belongs to the innermost thing that has something to do with it,
 * and a field with an edit in it does: Escape puts the edit back. Only after
 * that — with focus given up and the press landing on nothing in particular —
 * does it mean "put this layer away". So the first Escape restores the field
 * and the second closes the panel, which is one key doing one thing at a time
 * rather than two things at once.
 *
 * Checkboxes and radios are deliberately not here. They hold no edit to
 * restore, so Escape on one has nothing to be about and may as well close. */
const OWNS_ESCAPE =
  'input:not([type="checkbox"]):not([type="radio"]),textarea,select,[contenteditable="true"]';

/** How far the pointer may travel between down and up and still be a click
 * rather than a drag. The same 3px the canvas's own grab-pan uses to tell a
 * press from a pan, so the two agree about what a click is. */
const DRAG_SLOP_PX = 3;

interface PanelDismissOptions {
  /** The panel. A press inside it is never a dismissal. */
  panelRef: React.RefObject<HTMLElement | null>;
  /** A CSS selector for everything else whose press belongs to it rather than
   * to the page: the things that will select another task themselves, the
   * strips that own a gesture, the layers stacked above. Presses landing in
   * any of them leave the panel alone.
   *
   * It also gates the key: inside these, Escape already means "cancel what I
   * am typing here", and one press should not mean two things. Fields that
   * hold an edit are gated as well, wherever they are — see OWNS_ESCAPE. */
  ignoreSelector: string;
  /** Called for a press outside, and for Escape. The caller decides what
   * closing means — the panel commits its half-finished fields first. */
  onDismiss: () => void;
}

/** A panel dismissed by a press outside it, or by Escape. */
export function usePanelDismiss({ panelRef, ignoreSelector, onDismiss }: PanelDismissOptions): void {
  // Read through a ref, for the reason given on useMenuDismiss: the caller
  // builds this inline, and re-attaching three document listeners on every
  // render of the plan screen is not what the effect is for.
  const latest = useRef(onDismiss);
  latest.current = onDismiss;

  useEffect(() => {
    // Whether the press that is currently down began somewhere that could
    // dismiss, and where it began. Both are decided at `pointerdown`, because
    // by `pointerup` the element under the pointer may be gone — a bar that
    // was dragged out from under it, a menu row that closed its own menu.
    let armed = false;
    let startX = 0;
    let startY = 0;

    const dismissable = (target: EventTarget | null) => {
      const element = target instanceof Element ? target : null;
      const panel = panelRef.current;
      if (!panel || !element) return false;
      return !panel.contains(element) && element.closest(ignoreSelector) === null;
    };

    const onPointerDown = (event: PointerEvent) => {
      armed = event.isPrimary && dismissable(event.target);
      startX = event.clientX;
      startY = event.clientY;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!armed) return;
      armed = false;
      // A press that travelled is a pan, a resize or a bar being moved, not a
      // click on the page behind the panel.
      if (Math.abs(event.clientX - startX) > DRAG_SLOP_PX) return;
      if (Math.abs(event.clientY - startY) > DRAG_SLOP_PX) return;
      // And it has to still be outside when it lands. The canvas captures the
      // pointer for its pan, so `event.target` here is the canvas rather than
      // whatever is under the cursor — which is exactly the answer wanted.
      if (!dismissable(event.target)) return;
      latest.current();
    };

    // Capture, and this one is not optional. A field that cancels itself on
    // Escape — the list's rename, the create lane's name — has unmounted its
    // input by the time a bubbling listener on the document is reached, and an
    // unmounted element has no ancestors: `closest` returns null and the press
    // reads as having happened on the page. Capturing puts this ahead of
    // React's own handler, while the target is still where it was pressed.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const element = event.target instanceof Element ? event.target : null;
      if (element?.closest(ignoreSelector)) return;
      if (element?.closest(OWNS_ESCAPE)) return;
      latest.current();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [panelRef, ignoreSelector]);
}
