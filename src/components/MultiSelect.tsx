/** The design system's MultiSelect, transcribed.
 *
 * Source: `design-system/components/forms/MultiSelect.jsx`. Same rule as
 * `systemUi.ts` and `Switch.tsx` — the primitives cannot be imported, so the
 * only way to draw one is to restate it. The trigger's chips, the "+ N more"
 * overflow at three, the checkbox rows, the "(Select All)" row and the
 * Clear/Close footer are all the system's.
 *
 * One thing is not a transcription: the popover's search box. The primitive
 * renders it unwired — it filters nothing — and shipping a control that does
 * nothing is worse than the small liberty of making it work, so here it
 * filters the rows it sits above.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, CircleX, Search, X } from 'lucide-react';
import { FOCUS_RING } from './systemUi';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  /** How many chips the trigger shows before the rest collapse into "+ N
   * more" — the system's own default. */
  maxCount?: number;
  /** Layout only; the control's own box is the system's. */
  className?: string;
  ariaLabel: string;
  /** So a `<label for>` beside it can name the trigger. */
  id?: string;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Select options',
  maxCount = 3,
  className = '',
  ariaLabel,
  id,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const toggle = (option: string) =>
    onValueChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);

  const labelOf = (option: string) => options.find((item) => item.value === option)?.label ?? option;
  const visible = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const allSelected = options.length > 0 && value.length === options.length;

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className={`flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background p-1 text-left ${FOCUS_RING}`}
      >
        {value.length > 0 ? (
          <span className="flex w-full items-center justify-between">
            <span className="flex flex-wrap items-center overflow-hidden">
              {value.slice(0, maxCount).map((option) => (
                <span
                  key={option}
                  className="m-1 inline-flex max-w-[200px] items-center rounded-full border border-foreground/10 bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground"
                >
                  <span className="truncate">{labelOf(option)}</span>
                  <CircleX
                    size={16}
                    strokeWidth={2}
                    className="ml-2 flex-shrink-0 cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(option);
                    }}
                  />
                </span>
              ))}
              {value.length > maxCount && (
                <span className="m-1 inline-flex items-center rounded-full border border-foreground/10 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  + {value.length - maxCount} more
                  <CircleX
                    size={16}
                    strokeWidth={2}
                    className="ml-2 flex-shrink-0 cursor-pointer"
                    onClick={(event) => {
                      event.stopPropagation();
                      onValueChange(value.slice(0, maxCount));
                    }}
                  />
                </span>
              )}
            </span>
            <span className="flex flex-shrink-0 items-center">
              <X
                size={16}
                strokeWidth={2}
                className="mx-2 cursor-pointer text-muted-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  onValueChange([]);
                }}
              />
              <span className="inline-block min-h-6 w-px self-stretch bg-border" />
              <ChevronDown size={16} strokeWidth={2} className="mx-2 flex-shrink-0 text-muted-foreground" />
            </span>
          </span>
        ) : (
          <span className="flex w-full items-center justify-between">
            <span className="mx-3 text-sm text-muted-foreground">{placeholder}</span>
            <ChevronDown size={16} strokeWidth={2} className="mx-2 flex-shrink-0 text-muted-foreground" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center border-b border-border px-3">
            <Search size={16} strokeWidth={2} className="mr-2 flex-shrink-0 opacity-50" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              aria-label="Filter options"
              className="h-11 w-full border-none bg-transparent py-3 text-sm outline-none"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            <Row
              label="(Select All)"
              on={allSelected}
              onClick={() => onValueChange(allSelected ? [] : options.map((option) => option.value))}
            />
            {visible.map((option) => (
              <Row
                key={option.value}
                label={option.label}
                on={value.includes(option.value)}
                onClick={() => toggle(option.value)}
              />
            ))}
          </div>
          <div className="flex items-center border-t border-border p-1">
            {value.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => onValueChange([])}
                  className="flex-1 rounded-sm px-2 py-1.5 text-center text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Clear
                </button>
                <span className="min-h-6 w-px self-stretch bg-border" />
              </>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-sm px-2 py-1.5 text-center text-sm hover:bg-accent hover:text-accent-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={on}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
    >
      <span
        className={`mr-2 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-sm border border-primary text-primary-foreground ${
          on ? 'bg-primary opacity-100' : 'opacity-50'
        }`}
      >
        {on && <Check size={16} strokeWidth={2} />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
