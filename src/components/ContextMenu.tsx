import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MENU_ITEM_CLASS,
  MENU_ITEM_DESTRUCTIVE_CLASS,
  MENU_LABEL_CLASS,
  MENU_SEPARATOR_CLASS,
  MENU_SURFACE_CLASS,
} from './systemUi';

export interface ContextMenuAction {
  label: string;
  /** A lucide glyph at 14px, matching the system menu's own icon slot. */
  icon?: React.ReactNode;
  onSelect: () => void;
  /** Drawn in `--destructive` and separated from what comes before it — the
   * one row in a menu that cannot be undone. */
  destructive?: boolean;
}

interface ContextMenuProps {
  /** Where the pointer was, in viewport coordinates. */
  x: number;
  y: number;
  /** What the rows act on, shown as the menu's heading. */
  label: string;
  actions: ContextMenuAction[];
  onClose: () => void;
}

/** Roughly what the menu grows to, used only to keep it on screen. Anything
 * taller simply opens higher. */
const MENU_HEIGHT_PX = 210;
const MENU_WIDTH_PX = 224;
const VIEWPORT_MARGIN_PX = 8;

/** A menu opened at the pointer, drawn to the design system's menu contract
 * (see MENU_SURFACE_CLASS and its neighbours in systemUi.ts).
 *
 * Portaled to `<body>` and positioned `fixed`, because every surface it opens
 * over — the plan's scroll container above all — clips its own overflow, and a
 * menu rendered inside one would be cut off at that container's edge.
 *
 * Closing is unconditional: Escape, a press anywhere outside, and selecting a
 * row all close it, and there is no draft inside to lose. The outside listener
 * watches `pointerdown` rather than `mousedown`, and in the capture phase: the
 * plan's canvas calls preventDefault() on its own pointerdown to start a pan,
 * which suppresses the compatibility mouse events entirely — a mousedown
 * listener never hears a press on the chart, and the menu would sit open over
 * a canvas being dragged underneath it. */
export function ContextMenu({ x, y, label, actions, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointerDown = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    // A second right-click elsewhere opens that target's own menu; this one
    // has to be gone before it does.
    document.addEventListener('contextmenu', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('contextmenu', onPointerDown, true);
    };
  }, [onClose]);

  const left = Math.max(
    VIEWPORT_MARGIN_PX,
    Math.min(x, window.innerWidth - MENU_WIDTH_PX - VIEWPORT_MARGIN_PX),
  );
  const top = Math.max(
    VIEWPORT_MARGIN_PX,
    Math.min(y, window.innerHeight - MENU_HEIGHT_PX - VIEWPORT_MARGIN_PX),
  );

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${label}`}
      className={`fixed ${MENU_SURFACE_CLASS}`}
      style={{ left, top }}
    >
      <div className={`${MENU_LABEL_CLASS} truncate`} title={label}>
        {label}
      </div>
      <div className={MENU_SEPARATOR_CLASS} />
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            action.onSelect();
          }}
          className={action.destructive ? MENU_ITEM_DESTRUCTIVE_CLASS : MENU_ITEM_CLASS}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
