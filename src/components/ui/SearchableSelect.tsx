import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Option<T = string> {
  value: T;
  label: string;
}

interface SearchableSelectProps<T = string> {
  value: T | '';
  options: Option<T>[];
  placeholder?: string;
  onChange: (value: T) => void;
}

export function SearchableSelect<T = string>({ value, options, placeholder, onChange }: SearchableSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selectedLabel = useMemo(() => options.find(o => o.value === value)?.label, [options, value]);
  useEffect(() => {
    // Keep the input showing the selected label when not actively searching
    if (!open) {
      setQuery(selectedLabel || '');
    }
  }, [selectedLabel, open]);

  // Reset and maintain highlighted index
  useEffect(() => {
    if (open) {
      setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    }
  }, [open, query, filtered.length]);

  useEffect(() => {
    if (!open) return;
    if (highlightedIndex < 0) return;
    const list = listContainerRef.current;
    if (!list) return;
    const item = list.querySelectorAll('[data-ss-option]')[highlightedIndex] as HTMLElement | undefined;
    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  return (
    <div className="relative" ref={containerRef}>
      <input
        className="w-full rounded-md border px-3 py-2 text-sm"
        placeholder={placeholder || 'Select...'}
        value={open ? query : (selectedLabel || '')}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            e.preventDefault();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((idx) => Math.min(idx + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((idx) => Math.max(idx - 1, 0));
          } else if (e.key === 'Enter') {
            if (open && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
              e.preventDefault();
              const chosen = filtered[highlightedIndex];
              onChange(chosen.value);
              setOpen(false);
              setQuery(chosen.label);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-md">
          <div className="max-h-48 overflow-auto">
            <div ref={listContainerRef}>
            {filtered.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">No results</div>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={(o.value as any).toString()}
                  type="button"
                  data-ss-option
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${i === highlightedIndex || value === o.value ? 'bg-muted' : ''}`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery(options.find(opt => opt.value === o.value)?.label || '');
                  }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                >
                  {o.label}
                </button>
              ))
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


