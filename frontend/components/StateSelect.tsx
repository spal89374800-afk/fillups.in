import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

interface StateSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

interface PanelPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export const StateSelect: React.FC<StateSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select State / UT',
  emptyLabel,
  className,
  disabled,
  ariaLabel = 'State / UT'
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const padding = 8;
    const desiredHeight = Math.min(340, (options.length + 1) * 38 + 10);
    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;
    const openUp = spaceBelow < Math.min(desiredHeight, 200) && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(140, Math.min(desiredHeight, available));
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - padding * 2);
    const left = Math.min(Math.max(padding, rect.left), window.innerWidth - width - padding);
    const top = openUp
      ? Math.max(padding, rect.top - maxHeight - 6)
      : Math.min(rect.bottom + 6, window.innerHeight - maxHeight - padding);

    setPosition({ top, left, width, maxHeight });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const handleReposition = () => updatePosition();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updatePosition]);

  const displayLabel = value || emptyLabel || placeholder;

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`relative flex items-center justify-between gap-2 text-left ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className || ''}`}
      >
        <span className={`min-w-0 truncate ${value ? '' : 'opacity-70'}`}>{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && position && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
            zIndex: 9999
          }}
          className="overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-1 text-slate-100 shadow-2xl shadow-black/60"
        >
          {emptyLabel !== undefined && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => handleSelect('')}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                !value ? 'bg-sky-500/20 font-semibold text-slate-100' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="truncate">{emptyLabel}</span>
              {!value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          )}
          {options.map(option => {
            const selected = option === value;
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selected ? 'bg-sky-500/20 font-semibold text-slate-100' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="truncate">{option}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};

export default StateSelect;
