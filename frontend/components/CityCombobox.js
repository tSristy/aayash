'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { DELIVERY_CITIES } from '@/lib/shipping';
import { inputCls } from '@/components/ui/Field';

/** Keyboard-accessible city combobox: type to filter, scroll to see 10 options. */
export default function CityCombobox({ value, onChange, disabled = false }) {
  const id = useId();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = DELIVERY_CITIES.filter((city) => (
    city.toLowerCase().includes(query.trim().toLowerCase())
  ));

  useEffect(() => {
    function outside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const option = document.getElementById(`${id}-option-${activeIndex}`);
    option?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, id, open]);

  function select(city) {
    onChange(city);
    setQuery('');
    setActiveIndex(0);
    setOpen(false);
    inputRef.current?.blur();
  }

  function openList() {
    setQuery('');
    setActiveIndex(0);
    setOpen(true);
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }

    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (filtered.length === 0) return;
      setActiveIndex((index) => (
        (index + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length
      ));
    }

    if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (filtered[activeIndex]) select(filtered[activeIndex]);
    }
  }

  return (
    <div className="relative grid gap-1.5" ref={containerRef}>
      <label htmlFor={`${id}-input`} className="text-sm font-bold">
        City / District <span className="text-[#A65A3E]">*</span>
      </label>
      <div className="relative">
        <input
          id={`${id}-input`}
          ref={inputRef}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={`${id}-list`}
          aria-expanded={open}
          aria-required="true"
          aria-activedescendant={open && filtered.length ? `${id}-option-${activeIndex}` : undefined}
          disabled={disabled}
          value={open ? query : value}
          placeholder={open ? 'Search city / district...' : 'Select your city / district'}
          onFocus={openList}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={`${inputCls} !rounded-none !border-[#E2D9CE] !bg-white pr-10 focus:!border-[#A65A3E]`}
        />
        <button
          type="button"
          aria-label={open ? 'Close city options' : 'Show city options'}
          aria-expanded={open}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) {
              setOpen(false);
              inputRef.current?.blur();
            } else {
              openList();
              inputRef.current?.focus();
            }
          }}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-stone-500 hover:text-[#A65A3E]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          id={`${id}-list`}
          role="listbox"
          aria-label="Cities and districts"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[360px] overflow-y-auto overscroll-contain border border-[#E2D9CE] bg-white py-1 shadow-xl"
        >
          {filtered.length ? filtered.map((city, index) => (
            <button
              key={city}
              id={`${id}-option-${index}`}
              type="button"
              role="option"
              aria-selected={city === value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(city)}
              className={`flex min-h-9 w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                index === activeIndex ? 'bg-[#F5F1EB] text-[#A65A3E]' : 'text-[#2E261F] hover:bg-[#F5F1EB]'
              }`}
            >
              <span>{city === 'Dhaka' ? 'Dhaka (city only)' : city}</span>
              {city === value && <span aria-hidden="true">✓</span>}
            </button>
          )) : (
            <p className="px-4 py-3 text-sm text-stone-500">No matching city. Try another spelling.</p>
          )}
        </div>
      )}
    </div>
  );
}
