async function parseJsonResponse(response: any) { try { const text = await response.text(); if (!text) return {}; return JSON.parse(text); } catch { return {}; } }
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

export type LocationSuggestionType = 'district' | 'city';

export interface LocationSuggestion {
  value: string;
  type: LocationSuggestionType;
  state?: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  // Set to focus suggestions on one type (optional). When omitted, both district & city show.
  preferType?: LocationSuggestionType;
  // Optional state filter so district/city suggestions stay within the chosen state.
  state?: string;
  autoComplete?: string;
  disabled?: boolean;
  onBlur?: () => void;
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 200;

const cache = new Map<string, LocationSuggestion[]>();

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  className,
  wrapperClassName,
  preferType,
  state,
  autoComplete = 'off',
  disabled,
  onBlur
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const skipNextFetch = useRef(false);

  // Keep internal input in sync when parent value changes externally (e.g. session restore).
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    const query = inputValue.trim();
    if (query.length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const cacheKey = `${preferType || 'all'}:${(state || '').toLowerCase()}:${query.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setOpen(cached.length > 0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
        const typeParam = preferType ? `&type=${preferType}` : '';
        const res = await fetch(`/api/locations?q=${encodeURIComponent(query)}${stateParam}${typeParam}`);
        const data = await parseJsonResponse(res);
        if (cancelled) return;
        const list: LocationSuggestion[] = Array.isArray(data?.suggestions) ? data.suggestions : [];
        const ordered = preferType ? list.filter(suggestion => suggestion.type === preferType) : list;
        cache.set(cacheKey, ordered);
        setSuggestions(ordered);
        setOpen(ordered.length > 0);
        setHighlight(-1);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, preferType, state]);

  const topSuggestions = useMemo(() => suggestions.slice(0, 20), [suggestions]);

  const commitValue = (next: string) => {
    skipNextFetch.current = true;
    setInputValue(next);
    onChange(next);
    setOpen(false);
    setHighlight(-1);
  };

  const handleInputChange = (next: string) => {
    setInputValue(next);
    onChange(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || topSuggestions.length === 0) {
      if (event.key === 'Enter' && topSuggestions.length > 0) {
        event.preventDefault();
        commitValue(topSuggestions[0].value);
        return;
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight(prev => (prev + 1) % topSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight(prev => (prev <= 0 ? topSuggestions.length - 1 : prev - 1));
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      if (highlight >= 0 && highlight < topSuggestions.length) {
        event.preventDefault();
        commitValue(topSuggestions[highlight].value);
      } else if (topSuggestions.length > 0) {
        event.preventDefault();
        commitValue(topSuggestions[0].value);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      setHighlight(-1);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${wrapperClassName || ''}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (topSuggestions.length > 0 && inputValue.trim().length >= MIN_CHARS) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay so a click on a suggestion registers before blur closes the list.
            setTimeout(() => {
              setOpen(false);
              onBlur?.();
            }, 150);
          }}
          placeholder={placeholder}
          className={className}
          autoComplete={autoComplete}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {loading && (
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin absolute right-2 pointer-events-none" />
        )}
      </div>

      {open && topSuggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full min-w-[320px] max-h-60 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50 py-1"
        >
          {topSuggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.type}:${suggestion.value}`}
              role="option"
              aria-selected={highlight === index}
              onMouseDown={(e) => {
                e.preventDefault();
                commitValue(suggestion.value);
              }}
              onMouseEnter={() => setHighlight(index)}
              className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2 ${
                highlight === index ? 'bg-blue-600/30 text-white' : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="truncate">{suggestion.value}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wide text-slate-400 flex-shrink-0">
                {suggestion.type}
                {suggestion.state ? ` · ${suggestion.state}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationAutocomplete;
